const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Product = sequelize.define(
  "Product",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      unique: "unique_product_name_constraint",
    },
    price: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    origin: {
      type: DataTypes.STRING,
    },
    description: {
      type: DataTypes.TEXT,
    },
    slug: {
      type: DataTypes.STRING,
      unique: "unique_product_slug_constraint",
    },
    category_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "product_category", // Tên bảng liên kết
        key: "id", // Cột được liên kết
      },
    },
    brand_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "brand", // Tên bảng liên kết
        key: "id", // Cột được liên kết
      },
    },
    ratings_sum: {
      type: DataTypes.FLOAT, // Lưu trữ đánh giá trung bình
      defaultValue: 0,
    },
    average_rating: {
      type: DataTypes.FLOAT, // Lưu trữ đánh giá trung bình
      defaultValue: 0,
    },
    ratings_count: {
      type: DataTypes.INTEGER, // Lưu trữ số lượng đánh giá
      defaultValue: 0,
    },
  },
  {
    tableName: "product",
    timestamps: true,
  }
);

// Trong model Product
Product.associate = (models) => {
  Product.belongsTo(models.Brand, { foreignKey: "brand_id" });
  Product.belongsTo(models.Product_Category, { foreignKey: "category_id" });
  Product.hasMany(models.Variant, { foreignKey: "product_id" });
  Product.hasMany(models.Wishlist_Item, { foreignKey: "product_id" });
};

module.exports = Product;
