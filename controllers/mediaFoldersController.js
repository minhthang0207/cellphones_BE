const { nanoid } = require("nanoid");
const path = require("path");
const { Op } = require("sequelize");

const catchAsync = require("../utils/catchAsync");
const { bucket } = require("../utils/firebaseAdmin");
const AppError = require("../utils/appError");

const MediaFolder = require("../models/MediaFolders");
const Media = require("../models/Media");

// 1. API: Tạo thư mục mới
exports.createFolder = catchAsync(async (req, res, next) => {
  const { name, parent_id } = req.body;

  if (!name || !name.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Vui lòng nhập tên thư mục" });
  }

  // Chuẩn hóa parent_id giống như hàm getFolders của bạn
  const targetParentId =
    !parent_id || parent_id === "null" || parent_id === "undefined"
      ? null
      : parent_id;

  // 1. Kiểm tra xem tên này đã tồn tại ở cấp này chưa
  const existingFolder = await MediaFolder.findOne({
    where: {
      name: name.trim(),
      parent_id: targetParentId,
    },
  });

  if (existingFolder) {
    return res.status(400).json({
      success: false,
      message: "Tên thư mục đã tồn tại trong thư mục này",
    });
  }

  // 2. Nếu chưa có thì mới tạo
  const newFolder = await MediaFolder.create({
    name: name.trim(),
    parent_id: targetParentId,
  });

  res.status(201).json({ success: true, data: newFolder });
});
// 2. Lấy danh sách thư mục
exports.getFolders = catchAsync(async (req, res, next) => {
  let parent_id = req.query.parent_id;

  // 1. Chuẩn hóa dữ liệu: Bất cứ thứ gì không hợp lệ đều gom về null nguyên thủy của JS
  if (!parent_id || parent_id === "null" || parent_id === "undefined") {
    parent_id = null;
  }

  // 2. Gọi DB (Sequelize cực kỳ thông minh: truyền null nó sẽ TỰ ĐỘNG dịch ra IS NULL)
  const folders = await MediaFolder.findAll({
    where: { parent_id: parent_id },
    order: [["createdAt", "DESC"]],
  });

  res.status(200).json({ success: true, data: folders });
});

// 4. Xóa HÀNG LOẠT thư mục (Và tự động dọn sạch thư mục con + ảnh)
exports.bulkDeleteFolders = catchAsync(async (req, res, next) => {
  const { ids } = req.body; // FE sẽ gửi lên mảng [id1, id2, ...]

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Không có thư mục nào được chọn" });
  }

  // 1. THUẬT TOÁN QUÉT CÂY: Tìm toàn bộ thư mục Con, Cháu, Chắt...
  let allFolderIdsToTrash = [...ids]; // Mảng chứa toàn bộ ID sẽ bị xóa
  let currentParentIds = [...ids]; // Mảng tạm để dò tìm lớp kế tiếp

  while (currentParentIds.length > 0) {
    // Tìm các thư mục con có parent_id nằm trong danh sách currentParentIds
    const subFolders = await MediaFolder.findAll({
      where: { parent_id: { [Op.in]: currentParentIds } },
      attributes: ["id"], // Chỉ lấy cột id cho nhẹ
    });

    const subFolderIds = subFolders.map((f) => f.id);

    if (subFolderIds.length > 0) {
      allFolderIdsToTrash.push(...subFolderIds);
    }

    // Gán lại mảng tạm để vòng lặp tiếp tục đào sâu xuống lớp dưới
    currentParentIds = subFolderIds;
  }

  // 2. Tìm TẤT CẢ hình ảnh nằm trong toàn bộ các thư mục này
  const mediaFiles = await Media.findAll({
    where: { folder_id: { [Op.in]: allFolderIdsToTrash } },
  });

  // 3. Nếu có ảnh, tiến hành xóa Firebase trước
  if (mediaFiles.length > 0) {
    const deletePromises = mediaFiles.map(async (media) => {
      try {
        const filePath = media.url.replace(
          `https://storage.googleapis.com/${bucket.name}/`,
          "",
        );
        await bucket.file(decodeURIComponent(filePath)).delete();
      } catch (error) {
        console.error(`Bỏ qua lỗi Firebase với file ${media.url}:`, error);
      }
    });

    await Promise.all(deletePromises);

    // 4. Xóa Database ảnh (Chỉ 1 câu lệnh tối ưu)
    await Media.destroy({
      where: { folder_id: { [Op.in]: allFolderIdsToTrash } },
    });
  }

  // 5. Xóa toàn bộ Thư mục (Chỉ 1 câu lệnh tối ưu)
  await MediaFolder.destroy({
    where: { id: { [Op.in]: allFolderIdsToTrash } },
  });

  res.status(200).json({
    success: true,
    message: `Đã xóa vĩnh viễn ${allFolderIdsToTrash.length} thư mục và ${mediaFiles.length} ảnh.`,
  });
});

// 7. API: XỬA THƯ MỤC (/api/folders/:id)
exports.updateFolder = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;

  // 1. Kiểm tra đầu vào cơ bản
  if (!name || !name.trim()) {
    return next(new AppError("Tên thư mục không được để trống", 400));
  }

  // 2. Tìm thư mục cần cập nhật
  const folder = await MediaFolder.findByPk(id);
  if (!folder) {
    return next(new AppError("Không tìm thấy thư mục này", 404));
  }

  // 3.  Kiểm tra trùng tên trong cùng thư mục cha
  // Chúng ta kiểm tra xem có thư mục nào KHÁC (id != id hiện tại)
  // mà có cùng tên và cùng parent_id không.
  const isDuplicate = await MediaFolder.findOne({
    where: {
      name: name.trim(),
      parent_id: folder.parent_id,
      id: { [Op.ne]: id }, // Không tính chính nó (Op cần import từ Sequelize)
    },
  });

  if (isDuplicate) {
    return next(new AppError("Tên thư mục này đã tồn tại", 400));
  }

  // 4. Cập nhật và lưu
  folder.name = name.trim();
  await folder.save();

  // 5. Trả về kết quả khớp với mong đợi của Frontend
  res.status(200).json({
    success: true,
    message: "Đổi tên thành công!",
    data: folder,
  });
});
