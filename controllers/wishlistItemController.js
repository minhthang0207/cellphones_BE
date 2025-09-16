const Brand = require("../models/Brand");
const Product = require("../models/Product");
const Product_Category = require("../models/Product_Category");
const Wishlist_Item = require("../models/Wishlist_Item");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.getAllWishlistItem = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.params.userId) filter = { user_id: req.params.userId };
  const wishlistItems = await Wishlist_Item.findAll({
    where: filter,
    include: [
      {
        model: Product, // Liên kết với bảng Variant để lấy thông tin biến thể
        include: [
          {
            model: Brand,
            attributes: ["id", "slug"], // Liên kết với bảng Product để lấy thông tin sản phẩm
          },
          {
            model: Product_Category, // Liên kết với bảng Product để lấy thông tin sản phẩm
            attributes: ["id", "name", "slug"],
          },
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  if (!wishlistItems) {
    return next(new AppError("Không tìm thấy kết quả", 404));
  }
  res.status(201).json({
    status: "success",
    data: {
      wishlistItems,
    },
  });
});

exports.createWishlistItem = catchAsync(async (req, res, next) => {
  const { user_id, product_id } = req.body;

  const existingWishlistItem = await Wishlist_Item.findOne({
    where: { user_id, product_id },
  });

  if (existingWishlistItem) {
    return next(
      new AppError("Sản phẩm này đã tồn tại trong danh sách yêu thích", 400)
    );
  }

  const product = await Product.findOne({ where: { id: product_id } });
  if (!product) {
    return next(new AppError("Sản phẩn không tồn tại", 404));
  }

  const newWishlistItem = await Wishlist_Item.create({ user_id, product_id });

  const wishlistItemWithDetails = await Wishlist_Item.findOne({
    where: { id: newWishlistItem.id }, // Lấy theo ID của Cart Item mới tạo
    include: [
      {
        model: Product,
        include: [
          {
            model: Brand,
            attributes: ["id", "slug"], // Liên kết với bảng Product để lấy thông tin sản phẩm
          },
          {
            model: Product_Category, // Liên kết với bảng Product để lấy thông tin sản phẩm
            attributes: ["id", "name", "slug"],
          },
        ],
      },
    ],
  });

  res.status(201).json({
    status: "success",
    data: {
      wishlistItemWithDetails,
    },
    mesage: "Tạo mới thành công",
  });
});

// exports.updateWishListItem = catchAsync(async (req, res, next) => {
//   const { cartId } = req.params;
//   const { quantity } = req.body;

//   console.log(cartId, quantity);

//   const cartItem = await Cart_Item.findByPk(cartId);

//   if (!cartItem) {
//     return res
//       .status(404)
//       .json({ message: "Không tìm thấy sản phẩm trong giỏ hàng" });
//   }

//   // Tìm Variant liên quan đến cartItem
//   const variant = await Variant.findOne({ where: { id: cartItem.variant_id } });
//   if (!variant) {
//     return res.status(404).json({ message: "Sản phẩm không tồn tại" });
//   }

//   if (variant.stock_quantity < quantity) {
//     return res.status(400).json({ message: "Số lượng trong kho không đủ" });
//   }

//   cartItem.quantity = quantity || cartItem.quantity;
//   cartItem.save();

//   res.status(200).json({
//     status: "success",
//     data: {
//       cartItem,
//     },
//     message: "Cập nhật thành công",
//   });
// });
exports.deleteWishListItem = catchAsync(async (req, res, next) => {
  const { wishListId } = req.params;
  console.log(wishListId);

  const wishListItem = await Wishlist_Item.findByPk(wishListId);
  if (!wishListItem) {
    return res
      .status(404)
      .json({ message: "Không tìm thấy sản phẩm trong danh sách yêu thích" });
  }

  const product = await Product.findOne({
    where: { id: wishListItem.product_id },
  });
  if (!product) {
    return next(new AppError("Sản phẩn không tồn tại", 404));
  }

  await wishListItem.destroy();

  res.status(200).json({
    status: "success",
    message: "Xóa thành công",
  });
});
