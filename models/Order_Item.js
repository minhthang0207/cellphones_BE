const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Order_Item = sequelize.define(
  "Order_Item",
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
    origin_price: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },

    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "order", // Tên bảng liên kết
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
    tableName: "order_item",
    timestamps: true,
  }
);

Order_Item.associate = (models) => {
  Order_Item.belongsTo(models.Order, { foreignKey: "order_id", as: "order" });
  Order_Item.belongsTo(models.Variant, { foreignKey: "variant_id" });
};

module.exports = Order_Item;
