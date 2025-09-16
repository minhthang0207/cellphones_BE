const Rom = require("../models/Rom");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.getAllRom = catchAsync(async (req, res, next) => {
  const roms = await Rom.findAll({
    order: [["createdAt", "DESC"]],
  });

  if (!roms) {
    return next(new AppError("Không tìm thấy kết quả", 404));
  }
  res.status(201).json({
    status: "success",
    data: {
      roms,
    },
  });
});
exports.createRom = catchAsync(async (req, res, next) => {
  const { capacity, description } = req.body;

  const existingRom = await Rom.findOne({ where: { capacity } });
  if (existingRom) {
    return next(new AppError("Dung lượng Rom này đã tồn tại", 400));
  }

  const slug = `${capacity}gb`;

  const newRom = await Rom.create({ capacity, description, slug });
  res.status(201).json({
    status: "success",
    data: {
      newRom,
    },
    mesage: "Tạo mới thành công",
  });
});
exports.getRom = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const rom = await Rom.findByPk(id);

  if (!rom) {
    return res
      .status(404)
      .json({ message: "Không tìm thấy dung lượng Rom này" });
  }

  res.status(200).json({
    status: "success",
    data: {
      rom,
    },
  });
});
exports.updateRom = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { capacity, description } = req.body;

  const rom = await Rom.findByPk(id);

  if (!rom) {
    return res
      .status(404)
      .json({ message: "Không tìm thấy dung lượng rom này" });
  }

  rom.capacity = capacity || rom.capacity; // Nếu không truyền name thì giữ nguyên giá trị cũ
  rom.description = description || rom.description; // Tương tự với description
  rom.slug = `${rom.capacity}gb`;

  await rom.save();

  res.status(200).json({
    status: "success",
    data: {
      rom,
    },
    message: "Cập nhật thành công",
  });
});
exports.deleteRom = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const rom = await Rom.findByPk(id);

  if (!rom) {
    return res
      .status(404)
      .json({ message: "Không tìm thấy dung lượng ROM này" });
  }

  await rom.destroy();

  res.status(200).json({
    status: "success",
    message: "Xóa thành công",
  });
});
