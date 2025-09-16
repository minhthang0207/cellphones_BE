const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Variant = sequelize.define(
  "Variant",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // Sử dụng UUIDV4 cho giá trị mặc định
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
    },
    stock_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    price: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      unique: "unique_variant_constraint",
    },
    color_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "color", // Tên bảng liên kết
        key: "id", // Cột được liên kết
      },
    },
    ram_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "ram", // Tên bảng liên kết
        key: "id", // Cột được liên kết
      },
    },
    rom_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "rom", // Tên bảng liên kết
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
    tableName: "variant",
    timestamps: true,
  }
);

Variant.associate = (models) => {
  Variant.belongsTo(models.Color, { foreignKey: "color_id" });
  Variant.belongsTo(models.Ram, { foreignKey: "ram_id" });
  Variant.belongsTo(models.Rom, { foreignKey: "rom_id" });
  Variant.belongsTo(models.Product, { foreignKey: "product_id" });
  Variant.hasMany(models.Cart_Item, { foreignKey: "variant_id" });
  Variant.hasMany(models.Order_Item, { foreignKey: "variant_id" });
};

module.exports = Variant;
