const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Cart_Item = sequelize.define(
  "Cart_Item",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // Sử dụng UUIDV4 cho giá trị mặc định
      primaryKey: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "user", // Tên bảng liên kết
        key: "id", // Cột được liên kết
      },
    },
    variant_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "variant", // Tên bảng liên kết
        key: "id", // Cột được liên kết
      },
    },
  },
  {
    tableName: "cart_item",
    timestamps: true,
  }
);

Cart_Item.associate = (models) => {
  Cart_Item.belongsTo(models.Variant, { foreignKey: "variant_id" });
};

module.exports = Cart_Item;
