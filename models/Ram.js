const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Ram = sequelize.define(
  "Ram",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // Sử dụng UUIDV4 cho giá trị mặc định
      primaryKey: true,
    },
    capacity: {
      type: DataTypes.INTEGER,
      unique: "unique_capacity_constraint",
    },
    slug: {
      type: DataTypes.STRING,
      unique: "unique_ram_slug_constraint",
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "ram",
    timestamps: true,
  }
);

Ram.associate = (models) => {
  Ram.hasMany(models.Variant, { foreignKey: "ram_id" });
};

module.exports = Ram;
