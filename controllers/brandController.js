const Brand = require("../models/Brand");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const { toSlug } = require("../utils/utils");

exports.getAllBrand = catchAsync(async (req, res, next) => {
  const brands = await Brand.findAll({
    order: [["createdAt", "DESC"]],
  });

  if (!brands) {
    return next(new AppError("Không tìm thấy thương hiệu", 404));
  }
  res.status(201).json({
    status: "success",
    data: {
      brands,
    },
  });
});
exports.createBrand = catchAsync(async (req, res, next) => {
  const { name, description } = req.body;

  const existingBrand = await Brand.findOne({ where: { name } });
  if (existingBrand) {
    return next(new AppError("Thương hiệu này đã có", 400));
  }
  const slug = toSlug(name);

  const newBrand = await Brand.create({ name, description, slug });
  res.status(201).json({
    status: "success",
    data: {
      newBrand,
    },
    mesage: "Tạo mới thành công",
  });
});
exports.getBrand = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const brand = await Brand.findByPk(id);

  if (!brand) {
    return res.status(404).json({ message: "Không tìm thấy thương hiệu này" });
  }

  res.status(200).json({
    status: "success",
    data: {
      brand,
    },
  });
});
exports.updateBrand = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, description } = req.body;

  const brand = await Brand.findByPk(id);

  if (!brand) {
    return res.status(404).json({ message: "Không tìm thấy thương hiệu" });
  }
  const slug = toSlug(name);

  brand.name = name || brand.name; // Nếu không truyền name thì giữ nguyên giá trị cũ
  brand.description = description || brand.description; // Tương tự với description
  brand.slug = slug;
  await brand.save();

  res.status(200).json({
    status: "success",
    data: {
      brand,
    },
    message: "Cập nhật thành công",
  });
});
exports.deleteBrand = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const brand = await Brand.findByPk(id);

  if (!brand) {
    return res.status(404).json({ message: "Không tìm thấy thương hiệu" });
  }

  await brand.destroy();

  res.status(200).json({
    status: "success",
    message: "Xóa thành công",
  });
});
