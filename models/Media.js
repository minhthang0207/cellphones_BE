const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Media = sequelize.define(
  "Media",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    file_name: {
      type: DataTypes.STRING,
      allowNull: true,
      comment:
        "Tên gốc của file khi người dùng upload (VD: dien-thoai-iphone.jpg)",
    },
    url: {
      type: DataTypes.TEXT, // Dùng TEXT thay vì STRING vì link Firebase kèm token bảo mật có thể rất dài
      allowNull: false,
      comment: "Đường dẫn ảnh thực tế trên Firebase",
    },
    file_size: {
      type: DataTypes.INTEGER, // Lưu dung lượng (Byte)
      allowNull: true,
      comment: "Dung lượng file tính bằng Byte để quản lý dung lượng kho",
    },
    mime_type: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Định dạng file (VD: image/jpeg, image/png, image/webp)",
    },
    folder_id: {
      type: DataTypes.UUID,
      allowNull: true, // Cho phép null (Nghĩa là ảnh nằm ở ngoài cùng, không thuộc thư mục nào)
      comment: "ID của thư mục chứa ảnh này",
    },
  },
  {
    tableName: "media",
    timestamps: true, // Tự động tạo createdAt (ngày upload) và updatedAt
  },
);

// Bảng Media hiện tại là kho chung, nên nó đứng ĐỘC LẬP
Media.associate = (models) => {
  // Một hình ảnh thuộc về một thư mục
  Media.belongsTo(models.MediaFolder, {
    foreignKey: "folder_id",
    as: "folder",
  });
};

module.exports = Media;
