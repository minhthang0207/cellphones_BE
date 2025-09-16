const Product = require("../models/Product");
const Product_Review = require("../models/Product_Review");
const User = require("../models/User");
const catchAsync = require("../utils/catchAsync");

exports.getProductReviews = catchAsync(async (req, res, next) => {
  // Lấy productId từ req.params
  let filter = {};
  if (req.params.productId) filter = { product_id: req.params.productId };

  // Tìm tất cả review của sản phẩm dựa trên productId
  const reviews = await Product_Review.findAll({
    where: filter,
    include: [
      {
        model: User,
        attributes: ["name", "avatar", "phone", "email"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  // Trả về danh sách review của sản phẩm
  res.status(201).json({
    status: "success",
    data: {
      reviews,
    },
  });
});

// Hàm thêm đánh giá và cập nhật sản phẩm
exports.createsReview = catchAsync(async (req, res, next) => {
  const { review, rating, product_id, user_id } = req.body;

  const product = await Product.findByPk(product_id);
  const user = await User.findByPk(user_id);

  if (!product) {
    return next(new AppError("Không tìm thấy sản phẩm", 400));
  }
  if (!user) {
    return next(new AppError("Không tìm thấy người dùng", 400));
  }

  // Thêm đánh giá vào bảng ProductReviews
  const newReview = await Product_Review.create({
    product_id,
    user_id,
    rating,
    review,
  });
  const reviews = await Product_Review.findAll({
    where: { product_id },
  });

  // Cập nhật lại tổng số sao và số lượng đánh giá trong bảng Product
  const ratingsSum = product.ratings_sum + rating;
  const ratingsCount = reviews.length;
  const averageRating = (ratingsSum / ratingsCount).toFixed(1);

  product.ratings_sum = ratingsSum;
  product.average_rating = averageRating;
  product.ratings_count = ratingsCount;

  await product.save();

  res.status(201).json({
    status: "success",
    data: {
      newReview,
    },
  });
});

// Hàm xóa review
exports.deleteReview = catchAsync(async (req, res, next) => {
  const { reviewId } = req.params;

  // Xóa review khỏi bảng ProductReviews
  const reviewToDelete = await Product_Review.findByPk(reviewId);
  if (!reviewToDelete) {
    throw new Error("Không tìm thấy đánh giá này");
  }

  await reviewToDelete.destroy();

  // Cập nhật lại thông tin đánh giá trong bảng Product
  const product = await Product.findByPk(reviewToDelete.product_id);
  if (!product) {
    throw new Error("Không tìm thấy sản phẩm");
  }

  // Cập nhật lại tổng số sao và số lượng đánh giá trong bảng Product
  const reviews = await Product_Review.findAll({
    where: { product_id: reviewToDelete.product_id },
  });

  const ratingsSum = product.ratings_sum - reviewToDelete.rating;
  const ratingsCount = reviews.length;
  const averageRating = ratingsCount > 0 ? ratingsSum / ratingsCount : 0; // Tránh chia cho 0

  product.ratings_sum = ratingsSum;
  product.average_rating = averageRating;
  product.ratings_count = ratingsCount;

  await product.save();

  res.status(201).json({
    status: "success",
    message: "Xóa thành công",
  });
});
