const { nanoid } = require("nanoid"); // Đừng quên import nanoid
const { Op } = require("sequelize");
const path = require("path");
const sequelize = require("../config/database");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { uploadImage } = require("../utils/image");
const { bucket } = require("../utils/firebaseAdmin");

const Media = require("../models/Media");
const MediaFolder = require("../models/MediaFolders");
const mediaFoldersController = require("../controllers/mediaFoldersController");

// Tìm tất cả các file có tên tương tự trong Database của folder đó (hàm lọc tên)
const getSafeFileName = async (folderId, originalName, usedNamesInSession) => {
  const ext = path.extname(originalName);
  const base = path.parse(originalName).name;
  const destId = folderId || null;

  // 1. Tìm tất cả các file có tên tương tự trong Database của folder đó
  const existingFiles = await Media.findAll({
    where: {
      folder_id: destId,
      file_name: { [Op.like]: `${base}%${ext}` },
    },
    attributes: ["file_name"],
  });

  const dbNames = existingFiles.map((f) => f.file_name);

  let newName = originalName;
  let counter = 2;

  // 2. Check trùng cả trong DB lẫn trong mảng usedNamesInSession (đang xử lý)
  while (
    dbNames.includes(newName) ||
    usedNamesInSession.has(`${destId}_${newName}`)
  ) {
    newName = `${base} (${counter})${ext}`;
    counter++;
  }

  // Đánh dấu tên này đã được dùng cho request này
  usedNamesInSession.add(`${destId}_${newName}`);
  return newName;
};

// 1. GET /api/media: Lấy danh sách Thư mục & Ảnh (Ảnh có phân trang)
exports.getMediaList = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;
  const offset = (page - 1) * limit;

  let folder_id = req.query.folder_id;
  if (!folder_id || folder_id === "null" || folder_id === "undefined") {
    folder_id = null;
  }

  const whereCondition = { folder_id: folder_id };
  const parentCondition = { parent_id: folder_id };

  // ==========================================
  // 1. CHỈ LẤY THƯ MỤC NẾU ĐANG Ở TRANG 1
  // ==========================================
  let folders = []; // Mặc định là mảng rỗng

  if (page === 1) {
    folders = await MediaFolder.findAll({
      where: parentCondition,
      order: [["createdAt", "DESC"]],
    });
  }

  // ==========================================
  // 2. LẤY HÌNH ẢNH (Luôn lấy theo phân trang)
  // ==========================================
  const mediaFiles = await Media.findAndCountAll({
    where: whereCondition,
    limit: limit,
    offset: offset,
    order: [["createdAt", "DESC"]],
  });

  // ==========================================
  // 3. ĐÓNG GÓI JSON
  // ==========================================
  res.status(200).json({
    success: true,
    data: {
      folders: folders, // Sẽ có data ở trang 1, và rỗng [] ở trang 2, 3...
      images: mediaFiles.rows,
    },
    pagination: {
      totalImages: mediaFiles.count,
      currentPage: page,
      totalPages: Math.ceil(mediaFiles.count / limit),
      limit: limit,
    },
  });
});

// 2. POST /api/media/bulk-delete: Xóa nhiều ảnh cùng lúc
exports.deleteMultipleMedia = catchAsync(async (req, res, next) => {
  const { ids } = req.body; // Frontend sẽ gửi lên mảng ids: ['id1', 'id2', ...]

  // Kiểm tra dữ liệu đầu vào
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return next(
      new AppError("Vui lòng cung cấp danh sách ID hình ảnh cần xóa", 400),
    );
  }

  // 1. Lấy tất cả thông tin ảnh từ DB để lấy URL Firebase
  // Sequelize tự động chuyển { id: ids } thành câu query "WHERE id IN ('id1', 'id2')" siêu nhanh
  const mediaList = await Media.findAll({
    where: { id: ids },
  });

  if (mediaList.length === 0) {
    return next(new AppError("Không tìm thấy hình ảnh nào hợp lệ để xóa", 404));
  }

  // 2. Xóa file vật lý trên Firebase (Dùng Promise.all ở Backend sẽ nhanh và an toàn hơn Frontend rất nhiều)
  const deleteFirebasePromises = mediaList.map((media) => {
    if (media.url) {
      const imagePath = media.url.replace(
        `https://storage.googleapis.com/${bucket.name}/`, // Nhớ check lại tên bucket của bạn
        "",
      );

      return bucket
        .file(decodeURIComponent(imagePath))
        .delete()
        .catch((err) => {
          console.log(
            `Bỏ qua file ${imagePath} do lỗi Firebase (Có thể đã bị xóa trước đó)`,
          );
          // BẮT BUỘC trả về Promise.resolve() để nếu 1 ảnh lỗi, các ảnh khác vẫn được xóa bình thường
          return Promise.resolve();
        });
    }
    return Promise.resolve();
  });

  await Promise.all(deleteFirebasePromises);

  // 3. Xóa hàng loạt dữ liệu trong Database chỉ bằng 1 câu Query duy nhất
  await Media.destroy({
    where: { id: ids },
  });

  res.status(200).json({
    success: true,
    message: `Đã xóa thành công ${mediaList.length} hình ảnh`,
  });
});

// 3. POST /api/media/bulk-upload: Upload nhiều ảnh cùng lúc
exports.uploadMultipleMedia = catchAsync(async (req, res, next) => {
  // 1. Validate đầu vào
  if (!req.files.media_images || req.files.media_images.length === 0) {
    return next(new AppError("Vui lòng chọn ít nhất 1 hình ảnh", 400));
  }

  let folder_id = req.body.folder_id;
  if (!folder_id || folder_id === "null" || folder_id === "undefined") {
    folder_id = null;
  }

  const usedNamesInSession = new Set();
  const successfullyUploadedPaths = []; // Lưu path để dọn dẹp nếu DB lỗi
  const t = await sequelize.transaction(); // Bắt đầu Transaction

  try {
    // 2. Upload vật lý lên Firebase trước
    // Lưu ý: Tên file vật lý trên Firebase nên có ID/Timestamp để không bao giờ trùng
    const uploadPromises = req.files.media_images.map(async (file) => {
      const result = await uploadImage(file, "media_library", bucket);

      // Lấy đường dẫn tương đối để xóa nếu cần (tùy vào hàm uploadImage của bạn)
      // Giả sử result trả về URL, ta cần parse lại path
      const bucketPrefix = `https://storage.googleapis.com/${bucket.name}/`;
      const filePath = decodeURIComponent(result.replace(bucketPrefix, ""));
      successfullyUploadedPaths.push(filePath);

      return result;
    });

    const uploadedUrls = await Promise.all(uploadPromises);

    // 3. Xử lý tên hiển thị và chuẩn bị bản ghi Database
    const mediaRecords = [];
    for (let i = 0; i < req.files.media_images.length; i++) {
      const file = req.files.media_images[i];

      // Gọi helper để lấy tên không trùng (ví dụ: "anh (2).jpg")
      const safeName = await getSafeFileName(
        folder_id,
        file.originalname,
        usedNamesInSession,
      );

      mediaRecords.push({
        url: uploadedUrls[i],
        file_name: safeName,
        file_size: file.size,
        mime_type: file.mimetype,
        folder_id: folder_id,
      });
    }

    // 4. Lưu vào Database với Transaction
    const savedMedia = await Media.bulkCreate(mediaRecords, { transaction: t });

    // Hoàn tất
    await t.commit();

    res.status(200).json({
      success: true,
      message: `Đã tải lên ${savedMedia.length} ảnh thành công`,
      data: savedMedia,
    });
  } catch (error) {
    // NẾU LỖI: Rollback DB và Xóa file đã upload lên Firebase
    await t.rollback();

    if (successfullyUploadedPaths.length > 0) {
      console.log("Đang dọn dẹp file rác trên Firebase do lỗi Database...");
      const deletePromises = successfullyUploadedPaths.map((path) =>
        bucket
          .file(path)
          .delete()
          .catch(() => {}),
      );
      // Chạy ngầm việc xóa rác, không cần await để trả về lỗi nhanh hơn
      Promise.all(deletePromises);
    }

    console.error("Upload Error:", error);
    return next(
      new AppError(error.message || "Lỗi trong quá trình lưu trữ ảnh", 500),
    );
  }
});

// Hàm copy nhiều hình ảnh cùng lúc (Trong folder có hình ảnh)
const processCopyImage = async (
  mediaId,
  destFolderId,
  t,
  usedNamesInSession,
  copiedPaths,
) => {
  const originalMedia = await Media.findByPk(mediaId, { transaction: t });
  if (!originalMedia) throw new Error(`Không tìm thấy ảnh ID: ${mediaId}`);

  const destId = destFolderId || null;
  const isSameFolder = originalMedia.folder_id === destId;

  // 1. Kiểm tra tên trong DB và Session
  const siblingMedia = await Media.findAll({
    where: { folder_id: destId },
    attributes: ["file_name"],
    transaction: t,
  });
  const existingNames = siblingMedia.map((m) => m.file_name);

  let ext = path.extname(originalMedia.file_name);
  let base = path.parse(originalMedia.file_name).name;
  let baseWithSuffix = isSameFolder ? `${base} - Copy` : base;

  let newName = `${baseWithSuffix}${ext}`;
  let counter = 2;
  while (
    existingNames.includes(newName) ||
    usedNamesInSession.has(`${destId}_img_${newName}`)
  ) {
    newName = `${baseWithSuffix} (${counter})${ext}`;
    counter++;
  }
  usedNamesInSession.add(`${destId}_img_${newName}`);

  // 2. Firebase Copy
  const bucketPrefix = `https://storage.googleapis.com/${bucket.name}/`;
  const oldPath = decodeURIComponent(
    originalMedia.url.replace(bucketPrefix, ""),
  );
  const parsedPath = path.parse(oldPath);
  const cleanPrefix = parsedPath.name
    .split("_")[0]
    .replace(/[^a-zA-Z0-9-]/g, "");
  const newPath = `${parsedPath.dir}/${cleanPrefix}_${Date.now()}_${nanoid(6)}${parsedPath.ext}`;

  await bucket.file(oldPath).copy(bucket.file(newPath));

  // ĐĂNG KÝ đường dẫn đã copy để dọn dẹp nếu lỗi
  copiedPaths.push(newPath);

  // 3. Lưu Database
  return await Media.create(
    {
      url: `${bucketPrefix}${encodeURIComponent(newPath)}`,
      file_name: newName,
      file_size: originalMedia.file_size,
      mime_type: originalMedia.mime_type,
      folder_id: destId,
    },
    { transaction: t },
  );
};
// Hàm copy nhiều folder cùng lúc
const processDeepCopyFolder = async (
  originalId,
  destParentId,
  t,
  usedNamesInSession,
  copiedPaths,
) => {
  const original = await MediaFolder.findByPk(originalId, { transaction: t });
  if (!original) return;

  const destId = destParentId || null;

  // 1. Check tên Folder
  const siblingFolders = await MediaFolder.findAll({
    where: { parent_id: destId },
    attributes: ["name"],
    transaction: t,
  });
  const existingNames = siblingFolders.map((f) => f.name);

  let baseName =
    original.parent_id === destId ? `${original.name} - Copy` : original.name;
  let newName = baseName;
  let counter = 2;
  while (
    existingNames.includes(newName) ||
    usedNamesInSession.has(`${destId}_fol_${newName}`)
  ) {
    newName = `${baseName} (${counter})`;
    counter++;
  }
  usedNamesInSession.add(`${destId}_fol_${newName}`);

  // 2. Tạo Folder mới
  const newFolder = await MediaFolder.create(
    {
      name: newName,
      parent_id: destId,
    },
    { transaction: t },
  );

  // 3. Copy file bên trong
  const files = await Media.findAll({
    where: { folder_id: originalId },
    transaction: t,
  });
  for (const file of files) {
    await processCopyImage(
      file.id,
      newFolder.id,
      t,
      usedNamesInSession,
      copiedPaths,
    );
  }

  // 4. Đệ quy các folder con
  const subs = await MediaFolder.findAll({
    where: { parent_id: originalId },
    transaction: t,
  });
  for (const sub of subs) {
    await processDeepCopyFolder(
      sub.id,
      newFolder.id,
      t,
      usedNamesInSession,
      copiedPaths,
    );
  }
};

// 4. POST /api/media/copy: Copy nhiều file, folder cùng lúc
exports.bulkCopy = catchAsync(async (req, res, next) => {
  const { items, destination_folder_id } = req.body;
  const destId = destination_folder_id || null;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: "Danh sách trống" });
  }

  const usedNamesInSession = new Set();
  const successfullyCopiedPaths = []; // Mảng "phòng thân" để xóa file rác

  const t = await sequelize.transaction();

  try {
    for (const item of items) {
      if (item.type === "FOLDER") {
        if (item.id === destId)
          throw new Error("Không thể copy thư mục vào chính nó!");
        await processDeepCopyFolder(
          item.id,
          destId,
          t,
          usedNamesInSession,
          successfullyCopiedPaths,
        );
      } else {
        await processCopyImage(
          item.id,
          destId,
          t,
          usedNamesInSession,
          successfullyCopiedPaths,
        );
      }
    }

    // Nếu đến đây nghĩa là mọi thứ ổn (10 file đều xong)
    await t.commit();
    res.status(200).json({ success: true, message: "Đã sao chép thành công!" });
  } catch (error) {
    // 1. ROLLBACK DATABASE NGAY LẬP TỨC
    await t.rollback();

    // 2. DỌN DẸP FIREBASE
    // Duyệt mảng các file đã lỡ copy lên để xóa bỏ
    if (successfullyCopiedPaths.length > 0) {
      console.log(
        `Đang dọn dẹp ${successfullyCopiedPaths.length} file lỗi trên Firebase...`,
      );

      const deletePromises = successfullyCopiedPaths.map((path) =>
        bucket
          .file(path)
          .delete()
          .catch((err) =>
            console.error(`Không thể xóa file rác ${path}:`, err),
          ),
      );

      // Không cần await res.status, cứ để nó chạy ngầm để trả về lỗi nhanh cho user
      Promise.all(deletePromises);
    }

    console.error("Bulk Copy Error:", error);
    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Lỗi trong quá trình dán dữ liệu. Hệ thống đã tự động dọn dẹp.",
    });
  }
});

// 5. POST /api/media/cut: Di chuyển nhiều file, folder cùng lúc
exports.bulkMove = catchAsync(async (req, res, next) => {
  const { items, destination_folder_id } = req.body;
  const destId = destination_folder_id || null;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: "Danh sách trống" });
  }

  // Set để theo dõi tên trong cùng một phiên dán (session)
  const usedNamesInSession = new Set();
  const t = await sequelize.transaction();

  try {
    for (const item of items) {
      if (item.type === "FOLDER") {
        if (item.id === destId)
          throw new Error("Không thể di chuyển thư mục vào chính nó!");

        const folder = await MediaFolder.findByPk(item.id, { transaction: t });
        if (folder) {
          // Lấy danh sách tên folder đang có tại đích để tránh trùng
          const siblingFolders = await MediaFolder.findAll({
            where: { parent_id: destId },
            attributes: ["name"],
            transaction: t,
          });
          const existingNames = siblingFolders.map((f) => f.name);

          let newName = folder.name;
          let counter = 2;

          // Nếu trùng tên tại đích hoặc trùng trong session dán
          while (
            existingNames.includes(newName) ||
            usedNamesInSession.has(`${destId}_fol_${newName}`)
          ) {
            newName = `${folder.name} (${counter})`;
            counter++;
          }
          usedNamesInSession.add(`${destId}_fol_${newName}`);

          // Cập nhật cả parent_id và name mới (nếu có đổi tên)
          await folder.update(
            { parent_id: destId, name: newName },
            { transaction: t },
          );
        }
      } else {
        // Xử lý Image
        const media = await Media.findByPk(item.id, { transaction: t });
        if (media) {
          const siblingMedia = await Media.findAll({
            where: { folder_id: destId },
            attributes: ["file_name"],
            transaction: t,
          });
          const existingNames = siblingMedia.map((m) => m.file_name);

          let ext = path.extname(media.file_name);
          let base = path.parse(media.file_name).name;
          let newName = media.file_name;
          let counter = 2;

          while (
            existingNames.includes(newName) ||
            usedNamesInSession.has(`${destId}_img_${newName}`)
          ) {
            newName = `${base} (${counter})${ext}`;
            counter++;
          }
          usedNamesInSession.add(`${destId}_img_${newName}`);

          // Cập nhật folder_id và file_name mới
          await media.update(
            { folder_id: destId, file_name: newName },
            { transaction: t },
          );
        }
      }
    }

    await t.commit();
    res
      .status(200)
      .json({ success: true, message: "Đã di chuyển thành công!" });
  } catch (error) {
    await t.rollback();
    console.error("Bulk Move Error:", error);
    res
      .status(500)
      .json({ success: false, message: error.message || "Lỗi khi di chuyển" });
  }
});

// 5. PATCH /api/media/:id : Cập nhật tên ảnh
exports.updateMedia = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { file_name } = req.body;

  // 1. Kiểm tra đầu vào
  if (!file_name || !file_name.trim()) {
    return next(new AppError("Tên file không được để trống", 400));
  }

  // 2. Tìm ảnh cần cập nhật
  const media = await Media.findByPk(id);
  if (!media) {
    return next(new AppError("Không tìm thấy ảnh này", 404));
  }

  // 3. Xử lý phần mở rộng (extension)
  // Đảm bảo người dùng không vô tình xóa mất đuôi file (ví dụ .png, .jpg)
  const oldExt = path.extname(media.file_name);
  let newName = file_name.trim();

  // Nếu người dùng nhập tên mới không có đuôi, ta tự nối đuôi cũ vào
  if (!path.extname(newName)) {
    newName += oldExt;
  }

  // 4. Kiểm tra trùng tên trong cùng một folder_id
  const isDuplicate = await Media.findOne({
    where: {
      file_name: newName,
      folder_id: media.folder_id, // Chỉ check trong cùng thư mục hiện tại
      id: { [Op.ne]: id }, // Loại trừ chính nó
    },
  });

  if (isDuplicate) {
    return next(new AppError("Tên file này đã tồn tại trong thư mục", 400));
  }

  // 5. Cập nhật Database (KHÔNG động vào Firebase)
  media.file_name = newName;
  await media.save();

  res.status(200).json({
    success: true,
    message: "Đổi tên ảnh thành công!",
    data: media,
  });
});
