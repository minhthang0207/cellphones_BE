const Ram = require("../models/Ram");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.getAllRam = catchAsync(async (req, res, next) => {
  const rams = await Ram.findAll({
    order: [["createdAt", "DESC"]],
  });

  if (!rams) {
    return next(new AppError("Không tìm thấy kết quả", 404));
  }
  res.status(201).json({
    status: "success",
    data: {
      rams,
    },
  });
});
exports.createRam = catchAsync(async (req, res, next) => {
  const { capacity, description } = req.body;

  const existingRam = await Ram.findOne({ where: { capacity } });
  if (existingRam) {
    return next(new AppError("Dung lượng ram này đã tồn tại", 400));
  }

  const slug = `${capacity}gb`;

  const newRam = await Ram.create({ capacity, description, slug });
  res.status(201).json({
    status: "success",
    data: {
      newRam,
    },
    mesage: "Tạo mới thành công",
  });
});
exports.getRam = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const ram = await Ram.findByPk(id);

  if (!ram) {
    return res
      .status(404)
      .json({ message: "Không tìm thấy dung lượng ram này" });
  }

  res.status(200).json({
    status: "success",
    data: {
      ram,
    },
  });
});
exports.updateRam = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { capacity, description } = req.body;

  const ram = await Ram.findByPk(id);

  if (!ram) {
    return res
      .status(404)
      .json({ message: "Không tìm thấy dung lượng ram này" });
  }

  ram.capacity = capacity || ram.capacity; // Nếu không truyền name thì giữ nguyên giá trị cũ
  ram.description = description || ram.description; // Tương tự với description
  ram.slug = `${ram.capacity}gb`;

  await ram.save();

  res.status(200).json({
    status: "success",
    data: {
      ram,
    },
    message: "Cập nhật thành công",
  });
});
exports.deleteRam = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const ram = await Ram.findByPk(id);

  if (!ram) {
    return res
      .status(404)
      .json({ message: "Không tìm thấy dung lượng ram này" });
  }

  await ram.destroy();

  res.status(200).json({
    status: "success",
    message: "Xóa thành công",
  });
});
