const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Product_Image = sequelize.define(
  "Product_Image",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // Sử dụng UUIDV4 cho giá trị mặc định
      primaryKey: true,
    },
    url: {
      type: DataTypes.STRING,
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "product", // Tên bảng liên kết
        key: "id", // Cột được liên kết
      },
    },
  },
  {
    tableName: "product_image",
    timestamps: true,
  }
);

module.exports = Product_Image;
