const User = require("../models/User");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const { upload } = require("../utils/multer");
const { bucket } = require("../utils/firebaseAdmin");

// Lấy tất cả thông tin của tất cả user
exports.getAllUsers = async (req, res, next) => {
  const users = await User.findAll({
    attributes: {
      exclude: ["passwordResetToken", "passwordResetExpires"],
    },
    order: [["role", "DESC"]],
  });

  if (!users) {
    return next(new AppError("Không tìm thấy kết quả", 404));
  }
  res.status(201).json({
    status: "success",
    data: {
      users,
    },
  });
};

// Lấy thông tin của 1 user (user đăng nhập)
exports.getUserProfile = async (req, res, next) => {
  const user = await User.findOne({
    attributes: { exclude: ["password"] }, // Loại bỏ trường password
    where: { id: req.user.id },
  });

  if (!user) {
    return next(new AppError("Không tìm thấy người dùng", 404));
  }
  res.status(201).json({
    status: "success",
    data: {
      user,
    },
  });
};

exports.updateUser = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const { role, isVerify, password, passwordConfirm } = req.body;

  const user = await User.findByPk(userId);

  if (!user) {
    return res.status(404).json({ message: "Không tìm thấy user này" });
  }

  if (role) {
    user.role = role;
  }
  if (isVerify) {
    user.isVerify = true;
  } else {
    user.isVerify = false;
  }
  if (password && passwordConfirm) {
    user.password = password;
    user.passwordConfirm = passwordConfirm;
  }
  await user.save();

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
    message: "Cập nhật thành công",
  });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  const user = await User.findByPk(userId);

  if (!user) {
    return res.status(404).json({ message: "Không tìm thấy người dùng này" });
  }

  await user.destroy();

  res.status(200).json({
    status: "success",
    message: "Xóa thành công",
  });
});

// Thay đổi thông tin của 1 user (user đăng nhập)
exports.updateUserProfile = catchAsync(async (req, res, next) => {
  // Sử dụng upload middleware trước khi lấy thông tin từ req.body và req.file
  upload.single("avatar")(req, res, async (err) => {
    // "avatar" là tên của trường tệp trong FormData
    if (err) {
      return next(err); // Nếu có lỗi trong quá trình tải tệp, trả lỗi về phía client
    }

    const { name, birth, gender } = req.body;
    const genderUpdate = gender === "true";
    const avatarFile = req.file; // Lấy tệp hình ảnh từ Multer
    let birthDate = null;

    if (birth) {
      const parsedDate = new Date(birth);
      if (parsedDate.getTime()) {
        birthDate = parsedDate; // Chỉ gán nếu ngày hợp lệ
      }
    }

    // Tiến hành các xử lý tiếp theo như lưu dữ liệu vào Firebase hoặc Cơ sở dữ liệu
    try {
      let avatarUrl = null;

      // Kiểm tra nếu có tệp avatar
      if (avatarFile) {
        const blob = bucket.file(
          `avatars/${Date.now()}_${avatarFile.originalname}`
        );
        const blobStream = blob.createWriteStream({
          metadata: {
            contentType: avatarFile.mimetype,
          },
        });

        blobStream.on("finish", async () => {
          avatarUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

          await blob.makePublic();
          // Cập nhật thông tin người dùng vào database ()
          await User.update(
            { name, birth: birthDate, avatar: avatarUrl, gender: genderUpdate }, // Các trường cần cập nhật
            { where: { id: req.user.id } } // Điều kiện để tìm người dùng
          );

          const updatedUser = await User.findByPk(req.user.id, {
            attributes: {
              exclude: [
                "password",
                "passwordResetToken",
                "passwordResetExpires",
              ], // Loại bỏ các trường không cần
            },
          });

          res.status(200).json({
            message: "Cập nhật thành công",
            data: { updatedUser },
          });
        });

        blobStream.end(avatarFile.buffer); // Gửi tệp hình ảnh lên Firebase
      } else {
        // Trường hợp không có tệp hình ảnh

        await User.update(
          { name, birth: birthDate, gender: genderUpdate }, // Các trường cần cập nhật
          { where: { id: req.user.id } } // Điều kiện để tìm người dùng
        );

        const updatedUser = await User.findByPk(req.user.id);
        res.status(200).json({
          message: "Cập nhật thành công (Không có avatar)",
          data: { updatedUser },
        });
      }
    } catch (error) {
      return next(new AppError("Có lỗi xảy ra. Vui lòng thử lại sau", 500));
    }
  });
});

// Thay đổi thông tin địa chỉ của user

exports.updateUserLocation = catchAsync(async (req, res, next) => {
  const { province, district, ward, address } = req.body;
  const addressString = `${address}, ${ward}, ${district}, ${province}`;

  await User.update(
    { address: addressString }, // Các trường cần cập nhật
    { where: { id: req.user.id } } // Điều kiện để tìm người dùng
  );

  const updatedUser = await User.findByPk(req.user.id, {
    attributes: {
      exclude: ["password", "passwordResetToken", "passwordResetExpires"], // Loại bỏ các trường không cần
    },
  });

  res.status(200).json({
    message: "Cập nhật thành công",
    data: { updatedUser },
  });
});
