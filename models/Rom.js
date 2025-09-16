const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Rom = sequelize.define(
  "Rom",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // Sử dụng UUIDV4 cho giá trị mặc định
      primaryKey: true,
    },
    capacity: {
      type: DataTypes.INTEGER,
      unique: "unique_rom_capacity_constraint",
    },
    slug: {
      type: DataTypes.STRING,
      unique: "unique_rom_slug_constraint",
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "rom",
    timestamps: true,
  }
);

Rom.associate = (models) => {
  Rom.hasMany(models.Variant, { foreignKey: "rom_id" });
};

module.exports = Rom;
