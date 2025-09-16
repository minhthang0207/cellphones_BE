const Variant = require("../models/Variant");
const Product = require("../models/Product");
const Color = require("../models/Color");
const Ram = require("../models/Ram");
const Rom = require("../models/Rom");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const { toSlug } = require("../utils/utils");

exports.getAllVariant = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.params.productId) filter = { product_id: req.params.productId };
  const variants = await Variant.findAll({
    include: [
      {
        model: Product, // Liên kết với bảng Product để lấy thông tin sản phẩm
        attributes: ["name", "image"],
      },
      {
        model: Color,
        attributes: ["id", "name", "code"], // Lấy cả id và name
      },
      {
        model: Ram,
        attributes: ["id", "capacity"],
      },
      {
        model: Rom,
        attributes: ["id", "capacity"],
      },
    ],
    where: filter,
    order: [["createdAt", "DESC"]],
  });

  if (!variants) {
    return next(new AppError("Không tìm thấy kết quả", 404));
  }
  res.status(201).json({
    status: "success",
    data: {
      variants,
    },
  });
});

exports.createVariant = catchAsync(async (req, res, next) => {
  const { name, stock_quantity, price, color_id, ram_id, rom_id, product_id } =
    req.body;
  const product = await Product.findByPk(product_id);

  if (!product) {
    return res.status(404).json({ message: "Sản phẩm không tồn tại!" });
  }

  const existingVariant = await Variant.findOne({
    where: {
      product_id,
      color_id,
      ram_id,
      rom_id,
    },
  });

  if (existingVariant) {
    return res
      .status(400)
      .json({ message: "Biến thể với các thuộc tính này đã tồn tại!" });
  }

  const slug = toSlug(name);
  const newVariant = await Variant.create({
    name,
    stock_quantity,
    price,
    color_id,
    ram_id,
    rom_id,
    product_id,
    slug,
  });

  res.status(201).json({
    message: "Thêm biến thể thành công!",
    data: newVariant,
  });
});

exports.updateVariant = catchAsync(async (req, res, next) => {
  const { variantId } = req.params;

  const { name, stock_quantity, price, color_id, ram_id, rom_id } = req.body;

  const variant = await Variant.findByPk(variantId);

  if (!variant) {
    return res.status(404).json({ message: "Không tìm thấy biến thể này" });
  }

  variant.name = name || variant.name;
  variant.stock_quantity = stock_quantity || variant.stock_quantity;
  variant.price = price || variant.price;
  variant.color_id = color_id || variant.color_id;
  variant.ram_id = ram_id || variant.ram_id;
  variant.rom_id = rom_id || variant.rom_id;
  variant.slug = toSlug(variant.name);

  await variant.save();

  res.status(200).json({
    status: "success",
    data: {
      variant,
    },
    message: "Cập nhật thành công",
  });
});

exports.deleteVariant = catchAsync(async (req, res, next) => {
  const { variantId } = req.params;

  const variant = await Variant.findByPk(variantId);

  if (!variant) {
    return res.status(404).json({ message: "Không tìm thấy biến thể này" });
  }

  await variant.destroy();

  res.status(200).json({
    status: "success",
    message: "Xóa thành công",
  });
});
