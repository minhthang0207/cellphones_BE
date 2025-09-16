const AppError = require("../utils/appError");

const handleSequelizeUniqueConstraintError = (error) => {
  const message = error.errors[0].message;
  return new AppError(message, 400);
};

const handleSequelizeDatabaseError = (error) => {
  const message = error.parent.sqlMessage;
  return new AppError(message, 400);
};

const handleJsonWebTokenError = () => {
  const message = "Mã thông báo không đúng";
  return new AppError(message, 403);
};

const handleTokenExpiredError = () => {
  const message = "Mã thông báo đã hết hạn";
  return new AppError(message, 401);
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrDev(err, req, res);
  } else if (process.env.NODE_ENV === "production") {
    let error;

    if (err.name === "SequelizeUniqueConstraintError") {
      error = handleSequelizeUniqueConstraintError(err);
    } else if (err.name === "SequelizeDatabaseError") {
      error = handleSequelizeDatabaseError(err);
    } else if (err.name === "JsonWebTokenError") {
      error = handleJsonWebTokenError();
    } else if (err.name === "TokenExpiredError") {
      error = handleTokenExpiredError();
    } else {
      error = new AppError(err.message, 400);
    }
    sendErrProd(error, req, res);
  }
};

const sendErrDev = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith("/api")) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
  // RENDER WEBSITE
  return res.status(err.statusCode).json({
    message: "Có lỗi xảy ra",
    msg: err.message,
  });
};

const sendErrProd = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith("/api")) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Có lỗi xảy ra",
    });
  }
  // RENDER WEBSITE
  return res.status(err.statusCode).json({
    message: "Có lỗi xảy ra (lỗi website)",
    msg: err.message,
  });
};
