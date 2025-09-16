const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // Sử dụng UUIDV4 cho giá trị mặc định
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: "unique_phone_constraint",
      validate: {
        isNumeric: true,
        len: [10, 15],
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      unique: "unique_email_constraint",
    },
    avatar: {
      type: DataTypes.STRING,
      defaultValue: "https://github.com/shadcn.png",
    },
    address: {
      type: DataTypes.STRING,
    },
    gender: {
      type: DataTypes.BOOLEAN,
      // true: name, false: nữ
      allowNull: true,
    },
    birth: {
      type: DataTypes.DATE,
    },
    role: {
      type: DataTypes.ENUM("user", "admin"),
      defaultValue: "user",
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    passwordConfirm: {
      type: DataTypes.VIRTUAL,
      validate: {
        isMatch(value) {
          if (value !== this.password) {
            throw new Error("Password confirmation does not match password");
          }
        },
      },
    },
    passwordResetToken: {
      type: DataTypes.STRING,
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
    },
    isVerify: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "user",
    timestamps: true,
  }
);

// User.associations = (model) => {
//   User.hasMany(model.Otp, { foreignKey: "user_id" });
// };

// Hash password before create user
User.beforeCreate(async (user) => {
  if (user.password) {
    user.password = await bcrypt.hash(user.password, 10);
  }
});

// Hash password before save user
User.beforeSave(async (user) => {
  if (!user.isNewRecord && user.changed("password")) {
    user.password = await bcrypt.hash(user.password, 12);
    user.passwordConfirm = undefined;
  }
});

// Kiểm tra mật khẩu khi đăng nhập
User.prototype.checkPassword = async function (inputPassword) {
  return await bcrypt.compare(inputPassword, this.password);
};

// Tạo passwordResetToken (Token để reset mật khẩu)
User.prototype.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

User.associate = (models) => {
  User.hasMany(models.Order, { foreignKey: "user_id" });
  User.hasMany(models.Product_Review, { foreignKey: "user_id" });
  User.hasMany(models.Message, { foreignKey: "sender_id", as: "sender" }); // One-to-many relationship with sender_id
  User.hasMany(models.Message, {
    foreignKey: "receiver_id",
    as: "receiver",
  }); // One-to-many relationship with receiver_id
};

module.exports = User;
