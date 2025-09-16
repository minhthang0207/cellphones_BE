// models/index.js
const fs = require("fs");
const path = require("path");

const models = {};

// Đọc tất cả các file mô hình trong thư mục 'models', ngoại trừ 'index.js'
fs.readdirSync(__dirname)
  .filter((file) => file !== "index.js")
  .forEach((file) => {
    const model = require(path.join(__dirname, file)); // Nhập mô hình
    console.log(`Loaded model: ${file}`); // Log mô hình đã được nạp
    models[model.name] = model; // Thêm mô hình vào đối tượng models
  });

// Kết nối các mô hình nếu cần (mối quan hệ giữa các mô hình)
Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = models; // Xuất tất cả các mô hình trong 1 đối tượng
