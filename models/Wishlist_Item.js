const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Wishlist_Item = sequelize.define(
  "Wishlist_Item",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // Sử dụng UUIDV4 cho giá trị mặc định
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "user", // Tên bảng liên kết
        key: "id", // Cột được liên kết
      },
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
    tableName: "wishlist_item",
    timestamps: true,
  }
);

Wishlist_Item.associate = (models) => {
  Wishlist_Item.belongsTo(models.Product, { foreignKey: "product_id" });
};

module.exports = Wishlist_Item;
