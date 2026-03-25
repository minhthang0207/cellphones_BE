const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const MediaFolder = sequelize.define(
  "MediaFolder",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Tên thư mục (VD: Ảnh Sản Phẩm, Ảnh Banner)",
    },
    parent_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    tableName: "media_folder",
    timestamps: true,
  },
);

MediaFolder.associate = (models) => {
  // Một thư mục có thể chứa nhiều hình ảnh
  MediaFolder.hasMany(models.Media, {
    foreignKey: "folder_id",
    as: "media_files", // Tên alias khi query
  });

  // 2. [MỚI] Tự liên kết: Một thư mục có THƯ MỤC CHA
  MediaFolder.belongsTo(models.MediaFolder, {
    foreignKey: "parent_id",
    as: "parentFolder", // VD: lấy ra thư mục gốc của thư mục hiện tại
  });

  // 3. [MỚI] Tự liên kết: Một thư mục có THƯ MỤC CON
  MediaFolder.hasMany(models.MediaFolder, {
    foreignKey: "parent_id",
    as: "subFolders", // VD: lấy ra toàn bộ thư mục con bên trong
  });
};

module.exports = MediaFolder;
