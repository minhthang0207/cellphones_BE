const jwt = require("jsonwebtoken");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

const authenticateJWT = catchAsync(async (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return next(new AppError("Không tìm thấy mã xác thực", 401));
  }

  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decode;
    next();
  } catch (error) {
    return next(new AppError("Token không hợp lệ hoặc đã hết hạn", 403));
  }
});

module.exports = authenticateJWT;
