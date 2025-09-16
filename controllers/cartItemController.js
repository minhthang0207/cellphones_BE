const sequelize = require("../config/database");
const Cart_Item = require("../models/Cart_Item");
const Color = require("../models/Color");
const Product = require("../models/Product");
const Ram = require("../models/Ram");
const Rom = require("../models/Rom");
const Variant = require("../models/Variant");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.getAllCartItem = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.params.userId) filter = { user_id: req.params.userId };
  const cartItems = await Cart_Item.findAll({
    where: filter,
    include: [
      {
        model: Variant, // Liên kết với bảng Variant để lấy thông tin biến thể
        include: [
          {
            model: Product, // Liên kết với bảng Product để lấy thông tin sản phẩm
            attributes: ["name", "image"],
          },
          {
            model: Ram, // Liên kết với bảng Product để lấy thông tin sản phẩm
            attributes: ["id", "capacity"],
          },
          {
            model: Rom, // Liên kết với bảng Product để lấy thông tin sản phẩm
            attributes: ["id", "capacity"],
          },
          {
            model: Color, // Liên kết với bảng Product để lấy thông tin sản phẩm
            attributes: ["id", "name", "code"],
          },
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  if (!cartItems) {
    return next(new AppError("Không tìm thấy kết quả", 404));
  }
  res.status(201).json({
    status: "success",
    data: {
      cartItems,
    },
  });
});

exports.createCartItem = catchAsync(async (req, res, next) => {
  const { user_id, variant_id, quantity } = req.body;

  const existingCartItem = await Cart_Item.findOne({
    where: { user_id, variant_id },
  });
  if (existingCartItem) {
    return next(new AppError("Sản phẩm này đã tồn tại trong giỏ hàng", 400));
  }

  const variant = await Variant.findOne({ where: { id: variant_id } });
  if (!variant) {
    return next(new AppError("Sản phẩn không tồn tại", 404));
  }

  if (variant.stock_quantity < quantity) {
    return next(new AppError("Số lượng trong kho không đủ", 400));
  }

  const newCartItem = await Cart_Item.create({ user_id, variant_id, quantity });

  const cartItemWithDetails = await Cart_Item.findOne({
    where: { id: newCartItem.id }, // Lấy theo ID của Cart Item mới tạo
    include: [
      {
        model: Variant,
        include: [
          {
            model: Product,
            attributes: ["name", "image"],
          },
          {
            model: Ram,
            attributes: ["id", "capacity"],
          },
          {
            model: Rom,
            attributes: ["id", "capacity"],
          },
          {
            model: Color,
            attributes: ["id", "name", "code"],
          },
        ],
      },
    ],
  });

  res.status(201).json({
    status: "success",
    data: {
      cartItemWithDetails,
    },
    mesage: "Tạo mới thành công",
  });
});

exports.updateCartItem = catchAsync(async (req, res, next) => {
  const { cartId } = req.params;
  const { quantity } = req.body;

  const cartItem = await Cart_Item.findByPk(cartId);

  if (!cartItem) {
    return res
      .status(404)
      .json({ message: "Không tìm thấy sản phẩm trong giỏ hàng" });
  }

  // Tìm Variant liên quan đến cartItem
  const variant = await Variant.findOne({ where: { id: cartItem.variant_id } });
  if (!variant) {
    return res.status(404).json({ message: "Sản phẩm không tồn tại" });
  }

  if (variant.stock_quantity < quantity) {
    return res.status(400).json({ message: "Số lượng trong kho không đủ" });
  }

  cartItem.quantity = quantity || cartItem.quantity;
  cartItem.save();

  res.status(200).json({
    status: "success",
    data: {
      cartItem,
    },
    message: "Cập nhật thành công",
  });
});
exports.deleteCartItem = catchAsync(async (req, res, next) => {
  const { cartId } = req.params;

  const cartItem = await Cart_Item.findByPk(cartId);
  if (!cartItem) {
    return res
      .status(404)
      .json({ message: "Không tìm thấy sản phẩm trong giỏ hàng" });
  }

  const variant = await Variant.findOne({ where: { id: cartItem.variant_id } });
  if (!variant) {
    return next(new AppError("Sản phẩn không tồn tại", 404));
  }

  await cartItem.destroy();

  res.status(200).json({
    status: "success",
    message: "Xóa thành công",
  });
});
