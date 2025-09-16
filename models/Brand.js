const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Brand = sequelize.define(
  "Brand",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // Sử dụng UUIDV4 cho giá trị mặc định
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      unique: "unique_brand_slug_constraint",
    },
    slug: {
      type: DataTypes.STRING,
      unique: "unique_brand_slug_constraint",
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "brand",
    timestamps: true,
  }
);

Brand.associate = (models) => {
  Brand.hasMany(models.Product, { foreignKey: "brand_id" });
};

module.exports = Brand;
