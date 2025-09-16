const Product_Category = require("../models/Product_Category");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const { toSlug } = require("../utils/utils");

exports.getAllCategory = catchAsync(async (req, res, next) => {
  const categories = await Product_Category.findAll({
    order: [["createdAt", "DESC"]],
  });

  if (!categories) {
    return next(new AppError("Không tìm thấy kết quả", 404));
  }
  res.status(201).json({
    status: "success",
    data: {
      categories,
    },
  });
});
exports.createCategory = catchAsync(async (req, res, next) => {
  const { name, description } = req.body;

  const slug = toSlug(name);

  const existingCategory = await Product_Category.findOne({ where: { slug } });
  if (existingCategory) {
    return next(new AppError("Loại sản phẩm này đã tồn tại", 400));
  }

  const newCategory = await Product_Category.create({
    name,
    description,
    slug,
  });
  res.status(201).json({
    status: "success",
    data: {
      newCategory,
    },
    mesage: "Tạo mới thành công",
  });
});
exports.getCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const category = await Product_Category.findByPk(id);

  if (!category) {
    return res
      .status(404)
      .json({ message: "Không tìm thấy loại sản phẩm này" });
  }

  res.status(200).json({
    status: "success",
    data: {
      category,
    },
  });
});
exports.updateCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, description } = req.body;

  const category = await Product_Category.findByPk(id);

  if (!category) {
    return res
      .status(404)
      .json({ message: "Không tìm thấy loại sản phẩm này" });
  }

  category.name = name || category.name; // Nếu không truyền name thì giữ nguyên giá trị cũ
  category.description = description || category.description; // Tương tự với description
  category.slug = toSlug(name);

  await category.save();

  res.status(200).json({
    status: "success",
    data: {
      category,
    },
    message: "Cập nhật thành công",
  });
});
exports.deleteCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const category = await Product_Category.findByPk(id);

  if (!category) {
    return res
      .status(404)
      .json({ message: "Không tìm thấy loại sản phẩm này" });
  }

  await category.destroy();

  res.status(200).json({
    status: "success",
    message: "Xóa thành công",
  });
});
