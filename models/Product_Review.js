const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Product_Review = sequelize.define(
  "Product_Review",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // UUIDV4 làm mặc định
      primaryKey: true,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1, // Đánh giá tối thiểu là 1 sao
        max: 5, // Đánh giá tối đa là 5 sao
      },
    },

    review: {
      type: DataTypes.TEXT,
      allowNull: true, // Có thể để trống nếu không có nội dung đánh giá
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "user", // Giả sử bạn có bảng `users` lưu thông tin người dùng
        key: "id",
      },
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "product", // Liên kết với bảng `Product`
        key: "id",
      },
    },
  },
  {
    tableName: "product_review",
    timestamps: true,
  }
);

Product_Review.associate = (models) => {
  Product_Review.belongsTo(models.User, { foreignKey: "user_id" });
};

module.exports = Product_Review;
