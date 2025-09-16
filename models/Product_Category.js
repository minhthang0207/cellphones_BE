const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Product_Category = sequelize.define(
  "Product_Category",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // Sử dụng UUIDV4 cho giá trị mặc định
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      unique: "unique_product_category_capacity_constraint",
    },
    slug: {
      type: DataTypes.STRING,
      unique: "unique_roduct_category_slug_constraint",
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "product_category",
    timestamps: true,
  }
);

Product_Category.associate = (models) => {
  Product_Category.hasMany(models.Product, { foreignKey: "category_id" });
};

module.exports = Product_Category;
