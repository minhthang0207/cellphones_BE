const catchAsync = require("../utils/catchAsync");
const User = require("../models/User");
const AppError = require("../utils/appError");
const jwt = require("jsonwebtoken");
const Otp = require("../models/Otp");
const Email = require("../utils/email");
const crypto = require("crypto");
const { Op } = require("sequelize");

// SIGN UP
exports.signup = catchAsync(async (req, res) => {
  const {
    name,
    phone,
    email,
    avatar,
    address,
    birth,
    password,
    passwordConfirm,
  } = req.body;

  if (password !== passwordConfirm) {
    return res.status(400).json({
      message: "Password confirmation does not match password",
    });
  }

  const newUser = await User.create({
    name,
    phone,
    email,
    avatar,
    address,
    birth,
    password,
    passwordConfirm,
  });

  res.status(201).json({
    message: "User create successfully",
    data: {
      email: newUser.email,
    },
  });
});

// LOGIN
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //   Check if email and password exist
  if (!email || !password) {
    return next(new AppError("Vui lòng điền đầy đủ thông tin", 400));
  }

  //   Check if user exist and password correct
  const user = await User.findOne({ where: { email } });
  if (!user) {
    return next(new AppError("Không tìm thấy người dùng"));
  }

  if (!(await user.checkPassword(password))) {
    return next(new AppError("Email hoặc mật khẩu không đúng"));
  }

  if (!user.isVerify) {
    return next(new AppError("Tài khoản này chưa được xác thực"));
  }

  //   Send token to client
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    }
  );

  const expriesInDays = parseInt(process.env.JWT_EXPIRES_IN.replace("d", ""));
  res.status(201).json({
    status: "success",
    data: {
      token,
      expires_in: expriesInDays,
    },
  });
});

// GENERATE OTP
exports.generateOTP = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user) {
    return next(new AppError("Không tìm thấy người dùng"));
  }
  const idUser = user.id;
  const newOtp = await Otp.create({
    user_id: idUser,
  });

  const expiresTimeInMinute =
    newOtp.expires_at.getTime() - newOtp.createdAt.getTime();

  await new Email(user, newOtp.code).sendVerifyAccount();

  res.status(201).json({
    status: "success",
    message: `Vui lòng kiểm tra email để nhập mã (Mã code có hiệu lực trong ${
      expiresTimeInMinute / 60000
    } phút) `,
  });
});

// VERIFY OTP
exports.verifyOTP = catchAsync(async (req, res, next) => {
  const { email, code } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user) {
    return next(new AppError("Không tìm thấy người dùng"));
  }
  const userId = user.id;
  const otp = await Otp.findOne({
    where: {
      user_id: userId,
    },
    order: [["expires_at", "DESC"]],
  });

  if (otp) {
    if (otp.code === code) {
      if (Date.now() - otp.expires_at.getTime() <= 0) {
        await User.update({ isVerify: true }, { where: { id: userId } });

        //   Send token to client
        const token = jwt.sign(
          { id: user.id, role: user.role },
          process.env.JWT_SECRET,
          {
            expiresIn: process.env.JWT_EXPIRES_IN,
          }
        );

        const expriesInDays = parseInt(
          process.env.JWT_EXPIRES_IN.replace("d", "")
        );
        res.status(201).json({
          status: "success",
          data: {
            token,
            expires_in: expriesInDays,
          },
          message: "Xác thực thành công",
        });
      } else {
        return next(new AppError("Mã xác thực này đã hết hạn"));
      }
    } else {
      return next(
        new AppError("Mã nhập chưa đúng hoặc hết hạn, vui lòng nhập lại")
      );
    }
  }
});

// FOTGOT PASSWORD
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user) {
    return next(new AppError("Không tìm thấy người dùng với email trên", 404));
  }
  const resetToken = user.createPasswordResetToken();
  await user.save();

  const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  try {
    await new Email(user, resetURL).sendPasswordResetToken();

    res.status(200).json({
      status: "success",
      message: "Vui lòng kiểm tra mail để thay đổi mật khẩu",
    });
  } catch (error) {
    return next(
      new AppError("Có lỗi xảy ra khi gửi mail. Vui lòng thử lại sau", 500)
    );
  }
});

// RESET PASSWORD
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token, password, passwordConfirm } = req.body;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const currentTime = new Date();
  const user = await User.findOne({
    where: {
      passwordResetToken: hashedToken,
      passwordResetExpires: {
        [Op.gt]: currentTime, // Dùng Sequelize.Op.gt để so sánh với thời gian hiện tại
      },
    },
  });
  if (!user) {
    return next(new AppError("Mã không hợp lệ hoặc hết hạn", 400));
  }
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;

  await user.save();

  //   Send token to client
  const token_access = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    }
  );

  const expriesInDays = parseInt(process.env.JWT_EXPIRES_IN.replace("d", ""));
  res.status(201).json({
    status: "success",
    data: {
      token: token_access,
      expires_in: expriesInDays,
    },
  });
});

// LOGOUT
// exports.logout = catchAsync(async (req, res, next) => {
//   const token = req.header("Authorization")?.split(" ")[1];
//   res.clearCookie(token);
//   res.status(200).json({
//     status: "success",
//     message: "Đăng xuất thành công",
//   });
// });
