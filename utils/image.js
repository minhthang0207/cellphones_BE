const { nanoid } = require("nanoid");
const path = require("path");

exports.uploadImage = (file, folderName, bucket) => {
  if (!file) return Promise.reject("Không tìm thấy file");

  // 1. Tách tên và extension
  const fileExt = path.extname(file.originalname);
  const fileNameWithoutExt = path.parse(file.originalname).name;

  // 2. Làm sạch tên file (Xóa khoảng trắng, ký tự đặc biệt)
  const cleanName = fileNameWithoutExt
    .replace(/\s+/g, "-") // Thay khoảng trắng bằng gạch ngang
    .replace(/[^a-zA-Z0-9-]/g, ""); // Xóa ký tự đặc biệt

  // 3. Tạo cấu trúc: originalname_date.now_nanoid.ext
  const finalFileName = `${folderName}/${cleanName}_${Date.now()}_${nanoid(6)}${fileExt}`;

  const blob = bucket.file(finalFileName);
  const blobStream = blob.createWriteStream({
    metadata: { contentType: file.mimetype },
    resumable: false,
  });

  return new Promise((resolve, reject) => {
    blobStream.on("error", (err) => {
      console.error("Upload error:", err);
      reject(err);
    });

    blobStream.on("finish", async () => {
      try {
        // await blob.makePublic();
        // Dùng encodeURIComponent để bảo vệ URL nếu tên file vẫn còn ký tự lạ
        const imageUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(blob.name)}`;
        resolve(imageUrl);
      } catch (err) {
        console.error("Make public error:", err);
        reject(err);
      }
    });

    blobStream.end(file.buffer);
  });
};
