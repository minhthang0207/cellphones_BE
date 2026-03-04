const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Post = sequelize.define(
  "Post",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // Sử dụng UUIDV4 cho giá trị mặc định
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING
    },
    name: {
      type: DataTypes.STRING,
    },
    slug: {
      type: DataTypes.STRING,
      unique: "unique_post_slug_constraint",
    },
    content: {
      type: DataTypes.TEXT("long"),
    },
    visibility: {
      type: DataTypes.STRING,
      type: DataTypes.ENUM(
        "Công khai",
        "Riêng tư",
      ),
      allowNull: false,
      defaultValue: "Công khai",
    },
  },
  {
    tableName: "post",
    timestamps: true,
  }
);

module.exports = Post;
