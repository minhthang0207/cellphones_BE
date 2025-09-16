const Product_Image = require("../models/Product_Image");
const Product = require("../models/Product");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const { toSlug } = require("../utils/utils");
const { upload } = require("../utils/multer");
const { bucket } = require("../utils/firebaseAdmin");

exports.setProductImagesIds = (req, res, next) => {
  if (!req.body.product) req.body.product = req.params.productId;
  next();
};

const uploadImage = async (file) => {
  const blob = bucket.file(
    `products_images/${Date.now()}_${file.originalname}`
  );
  const blobStream = blob.createWriteStream({
    metadata: {
      contentType: file.mimetype,
    },
  });

  return new Promise((resolve, reject) => {
    blobStream.on("finish", async () => {
      try {
        const imageUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
        await blob.makePublic();
        resolve(imageUrl); // Trả về URL hình ảnh đã upload
      } catch (err) {
        reject(err);
      }
    });
    blobStream.on("error", reject);
    blobStream.end(file.buffer);
  });
};

exports.getAllProductImage = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.params.productId) filter = { product_id: req.params.productId };
  const images = await Product_Image.findAll({
    where: filter,
    order: [["createdAt", "DESC"]],
  });

  if (!images) {
    return next(new AppError("Không tìm thấy kết quả", 404));
  }
  res.status(201).json({
    status: "success",
    data: {
      images,
    },
  });
});

exports.createProductImage = catchAsync(async (req, res, next) => {
  const { productId } = req.params;
  const product = await Product.findByPk(productId);

  if (!product) {
    return res.status(404).json({ message: "Sản phẩm không tồn tại!" });
  }

  if (!req.files || req.files.length === 0) {
    return res
      .status(400)
      .json({ message: "Vui lòng tải lên ít nhất một hình ảnh!" });
  }

  const imageUrls = [];
  for (const file of req.files) {
    const blob = bucket.file(`products/${Date.now()}_${file.originalname}`);
    const blobStream = blob.createWriteStream({
      metadata: { contentType: file.mimetype },
    });

    const uploadPromise = new Promise((resolve, reject) => {
      blobStream.on("finish", async () => {
        const imageUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
        await blob.makePublic();
        resolve(imageUrl);
      });
      blobStream.on("error", reject);
      blobStream.end(file.buffer);
    });

    const imageUrl = await uploadPromise;
    imageUrls.push(imageUrl);

    // Lưu thông tin hình ảnh vào cơ sở dữ liệu
    await Product_Image.create({
      productId,
      url: imageUrl,
    });
  }

  res.status(201).json({
    message: "Thêm hình ảnh thành công!",
    data: { images: imageUrls },
  });
});

exports.updateProductImage = catchAsync(async (req, res, next) => {
  try {
    const { imageId } = req.params; // Lấy ID sản phẩm từ tham số route

    const productImageFile = req.file;

    // Kiểm tra sự tồn tại của hình ảnh
    const image = await Product_Image.findByPk(imageId);
    if (!image) {
      return next(new AppError("Hình ảnh không tồn tại", 404));
    }

    let productImageUrl = image.url; // Giữ nguyên hình ảnh cũ nếu không có hình ảnh mới

    if (productImageFile) {
      productImageUrl = await uploadImage(productImageFile);
    }

    const updatedImage = await image.update({
      url: productImageUrl, // Cập nhật hình ảnh mới (nếu có)
    });

    res.status(200).json({
      message: "Cập nhật hình ảnh thành công",
      data: { updatedImage },
    });
  } catch (err) {
    return next(err); // Xử lý lỗi
  }
});

exports.deleteProductImage = catchAsync(async (req, res, next) => {
  const { imageId } = req.params;

  const image = await Product_Image.findByPk(imageId);

  if (!image) {
    return res.status(404).json({ message: "Không tìm thấy hình ảnh này" });
  }

  await image.destroy();

  res.status(200).json({
    status: "success",
    message: "Xóa thành công",
  });
});
