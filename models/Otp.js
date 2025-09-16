const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000);
};

const Otp = sequelize.define(
  "Otp",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // Sử dụng UUIDV4 cho giá trị mặc định
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING,
    },
    expires_at: {
      type: DataTypes.DATE,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "user",
        key: "id",
      },
    },
  },
  {
    tableName: "otp",
    timestamps: true,
  }
);

// Otp.associations = (model) => {
//   Otp.belongsTo(model.User, { foreignKey: "user_id" });
// };

Otp.beforeCreate((otp) => {
  otp.expires_at = new Date(otp.createdAt.getTime() + 120 * 1000);
  otp.code = generateOTP();
});

module.exports = Otp;
