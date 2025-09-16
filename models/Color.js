const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Color = sequelize.define(
  "Color",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // Sử dụng UUIDV4 cho giá trị mặc định
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
    },
    code: {
      type: DataTypes.STRING,
      unique: "unique_color_code_constraint",
    },
    slug: {
      type: DataTypes.STRING,
      unique: "unique_color_slug_constraint",
    },
  },
  {
    tableName: "color",
    timestamps: true,
  }
);

Color.associate = (models) => {
  Color.hasMany(models.Variant, { foreignKey: "color_id" });
};

module.exports = Color;
