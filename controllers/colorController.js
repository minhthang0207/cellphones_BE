const Color = require("../models/Color");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const { toSlug } = require("../utils/utils");

exports.getAllColor = catchAsync(async (req, res, next) => {
  const colors = await Color.findAll({
    order: [["createdAt", "DESC"]],
  });

  if (!colors) {
    return next(new AppError("Không tìm thấy kết quả", 404));
  }
  res.status(201).json({
    status: "success",
    data: {
      colors,
    },
  });
});

exports.createColor = catchAsync(async (req, res, next) => {
  const { name, code } = req.body;

  const existingColor = await Color.findOne({ where: { code } });
  if (existingColor) {
    return next(new AppError("màu sắc này đã tồn tại", 400));
  }

  const slug = toSlug(name);

  const newColor = await Color.create({ name, code, slug });
  res.status(201).json({
    status: "success",
    data: {
      newColor,
    },
    mesage: "Tạo mới thành công",
  });
});

exports.getColor = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const color = await Color.findByPk(id);

  if (!color) {
    return res.status(404).json({ message: "Không tìm thấy màu sắc này" });
  }

  res.status(200).json({
    status: "success",
    data: {
      color,
    },
  });
});

exports.updateColor = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, code } = req.body;

  const color = await Color.findByPk(id);

  if (!color) {
    return res.status(404).json({ message: "Không tìm thấy màu sắc này" });
  }

  color.name = name || color.name; // Nếu không truyền name thì giữ nguyên giá trị cũ
  color.code = code || color.code; // Tương tự với description
  color.slug = toSlug(name);

  await color.save();

  res.status(200).json({
    status: "success",
    data: {
      color,
    },
    message: "Cập nhật thành công",
  });
});
exports.deleteColor = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const color = await Color.findByPk(id);

  if (!color) {
    return res.status(404).json({ message: "Không tìm thấy màu sắc này" });
  }

  await color.destroy();

  res.status(200).json({
    status: "success",
    message: "Xóa thành công",
  });
});
