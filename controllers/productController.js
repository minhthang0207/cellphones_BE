const Product = require("../models/Product");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const { toSlug } = require("../utils/utils");
const { bucket } = require("../utils/firebaseAdmin");
const Brand = require("../models/Brand");
const Product_Category = require("../models/Product_Category");
const Product_Image = require("../models/Product_Image");
const { upload } = require("../utils/multer");
const APIFeaturesSequelize = require("../utils/apiFeatures");
const Variant = require("../models/Variant");
const Color = require("../models/Color");
const Ram = require("../models/Ram");
const Rom = require("../models/Rom");

// upload 1 hình ảnh
exports.uploadSingleImage = upload.single("product_image");

// Hàm upload hình ảnh lên Firebase Storage
const uploadImage = async (file, name) => {
  const blob = bucket.file(`${name}/${Date.now()}_${file.originalname}`);
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

exports.createProduct = catchAsync(async (req, res, next) => {
  try {
    const { name, price, origin, description, category_id, brand_id } =
      req.body;
    const productImageFile = req.files.product_image; // Hình ảnh chính
    const productImages = req.files.product_images || []; // Mảng hình ảnh phụ
    let productImageUrl = null;
    let productImageUrls = [];

    // Kiểm tra các trường bắt buộc
    if (!name || !price || !category_id || !brand_id) {
      return next(new AppError("Thiếu thông tin sản phẩm", 400));
    }

    // Kiểm tra bắt buộc phải có hình ảnh chính và ít nhất 1 hình ảnh phụ
    if (!productImageFile) {
      return next(new AppError("Hình ảnh chính là bắt buộc", 400));
    }

    const brand = await Brand.findByPk(brand_id);
    const category = await Product_Category.findByPk(category_id);

    // Kiểm tra brand và category
    if (!brand) return next(new AppError("Brand không tồn tại", 400));
    if (!category) return next(new AppError("Category không tồn tại", 400));

    // Upload hình ảnh chính
    if (productImageFile) {
      productImageUrl = await uploadImage(productImageFile[0], "products");
    }

    // Tạo sản phẩm mới
    const slug = toSlug(name);
    const newProduct = await Product.create({
      name,
      price,
      origin,
      description,
      slug,
      category_id,
      brand_id,
      image: productImageUrl, // Lưu hình ảnh chính vào cơ sở dữ liệu
    });

    // Upload các hình ảnh phụ
    if (productImages.length > 0) {
      productImageUrls = await Promise.all(
        productImages.map((item) => uploadImage(item, "product_images"))
      ); // Upload tất cả hình ảnh phụ

      // Lưu các hình ảnh phụ vào bảng Product_Images
      await Promise.all(
        productImageUrls.map((imageUrl) =>
          Product_Image.create({
            product_id: newProduct.id,
            url: imageUrl,
          })
        )
      );
    }

    res.status(200).json({
      message: "Tạo mới sản phẩm thành công",
      data: { newProduct },
    });
  } catch (err) {
    return next(err); // Lỗi từ Multer hoặc bất kỳ lỗi nào khác sẽ được ném ra và catchAsync sẽ xử lý
  }
});

exports.aliasTopOutstandingProduct = (req, res, next) => {
  req.query = { sort: "-average_rating", limit: "30" };
  next();
};

exports.getAllProduct = catchAsync(async (req, res, next) => {

  const features = new APIFeaturesSequelize(Product, req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const products = await features.apply();

  res.status(200).json({
    status: "success",
    result: products.length,
    data: products,
  });
});

exports.getProductWithAllAttribute = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const product = await Product.findByPk(id);

  if (!product) {
    return res.status(404).json({ message: "Không tìm thấy sản phẩm này" });
  }

  // const variants = await Variant.findAll({
  //   where: { product_id: id },
  // });

  const productImages = await Product_Image.findAll({
    where: { product_id: id },
  });

  product.setDataValue("productImages", productImages);

  res.status(200).json({
    status: "success",
    data: {
      product,
    },
  });
});

exports.getProductBySlug = catchAsync(async (req, res, next) => {
  const { slug } = req.params;

  const product = await Product.findOne({
    where: { slug: slug },
    include: [
      {
        model: Product_Category, // Giả sử Color là một model đã được định nghĩa trong Sequelize
        attributes: ["id", "name", "slug"], // Chỉ lấy các trường id và name của color
      },
    ],
  });

  if (!product) {
    return res.status(404).json({ message: "Không tìm thấy sản phẩm này" });
  }

  const productImages = await Product_Image.findAll({
    where: { product_id: product.id },
    attributes: ["id", "url"],
  });

  const variants = await Variant.findAll({
    where: { product_id: product.id },
    include: [
      {
        model: Product, // Liên kết với bảng Product để lấy thông tin sản phẩm
        attributes: ["name", "image"],
      },
      {
        model: Color, // Giả sử Color là một model đã được định nghĩa trong Sequelize
        attributes: ["id", "name", "code", "slug"], // Chỉ lấy các trường id và name của color
      },
      {
        model: Ram, // Giả sử Ram là một model đã được định nghĩa trong Sequelize
        attributes: ["id", "capacity", "slug"], // Chỉ lấy các trường id và size của ram
      },
      {
        model: Rom, // Giả sử Rom là một model đã được định nghĩa trong Sequelize
        attributes: ["id", "capacity", "slug"], // Chỉ lấy các trường id và size của rom
      },
    ],
  });

  res.status(200).json({
    status: "success",
    data: {
      product,
      productImages,
      variants,
    },
  });
});

exports.getProductInfo = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const product = await Product.findByPk(id);

  if (!product) {
    return res.status(404).json({ message: "Không tìm thấy sản phẩm này" });
  }

  res.status(200).json({
    status: "success",
    data: {
      product,
    },
  });
});

exports.updateProduct = catchAsync(async (req, res, next) => {
  try {
    // console.log("req.body:", req.body); // Log dữ liệu văn bản (text)
    // console.log("req.files:", req.files); // Log các tệp đã upload

    const { id } = req.params;
    const { name, price, origin, description, category_id, brand_id } =
      req.body;
    const productImageFile = req.files.product_image; // Hình ảnh chính
    const productImages = req.files.product_images || []; // Mảng hình ảnh phụ
    const removedImageIds = req.body.removed_image_ids
      ? JSON.parse(req.body.removed_image_ids)
      : [];

    let productImageUrl = null;
    let productImageUrls = [];

    // Kiểm tra các trường bắt buộc
    if (!id || !name || !price || !category_id || !brand_id) {
      return next(new AppError("Thiếu thông tin sản phẩm", 400));
    }

    const brand = await Brand.findByPk(brand_id);
    const category = await Product_Category.findByPk(category_id);

    // Kiểm tra sự tồn tại của Brand và Category
    if (!brand) return next(new AppError("Brand không tồn tại", 400));
    if (!category) return next(new AppError("Category không tồn tại", 400));

    // Tìm sản phẩm cần cập nhật
    const product = await Product.findByPk(id);

    if (!product) return next(new AppError("Sản phẩm không tồn tại", 400));

    // 1. Xóa hình ảnh chính trên Firebase nếu có thay đổi
    if (productImageFile) {
      // Nếu có hình ảnh mới, xóa hình ảnh cũ và thay thế
      const oldImage = product.image;
      if (oldImage) {
        const imagePath = oldImage.replace(
          "https://storage.googleapis.com/lamba-blog.appspot.com/",
          ""
        );
        await bucket.file(imagePath).delete(); // Xóa hình ảnh cũ trên Firebase
      }
      productImageUrl = await uploadImage(productImageFile[0], "products");
    }

    // 2. Cập nhật thông tin sản phẩm
    const slug = toSlug(name);
    const updatedProduct = await product.update({
      name,
      price,
      origin,
      description,
      slug,
      category_id,
      brand_id,
      image: productImageUrl || product.image, // Cập nhật hình ảnh chính nếu có
    });

    // 3. Xóa các hình ảnh phụ đã bị xóa trên Firebase
    if (removedImageIds.length > 0) {
      // Tìm các hình ảnh phụ cần xóa trong cơ sở dữ liệu
      const productImagesToDelete = await Product_Image.findAll({
        where: {
          id: removedImageIds,
          product_id: updatedProduct.id,
        },
      });

      for (const item of productImagesToDelete) {
        if (item.url) {
          const imagePath = item.url.replace(
            "https://storage.googleapis.com/lamba-blog.appspot.com/",
            ""
          );
          await bucket.file(imagePath).delete(); // Xóa hình ảnh phụ trên Firebase
          console.log(`Đã xóa hình ảnh phụ: ${imagePath}`);
        }
      }

      // Xóa các hình ảnh phụ khỏi cơ sở dữ liệu
      await Product_Image.destroy({
        where: {
          id: removedImageIds,
          product_id: updatedProduct.id,
        },
      });
    }

    // 4. Thêm hình ảnh phụ mới nếu có
    if (productImages.length > 0) {
      productImageUrls = await Promise.all(
        productImages.map((item) => uploadImage(item, "product_images"))
      );

      // Lưu các hình ảnh phụ vào bảng Product_Images
      await Promise.all(
        productImageUrls.map((imageUrl) =>
          Product_Image.create({
            product_id: updatedProduct.id,
            url: imageUrl,
          })
        )
      );
    }

    // Trả về kết quả
    res.status(200).json({
      message: "Cập nhật sản phẩm thành công",
      data: { updatedProduct },
    });
  } catch (err) {
    return next(err); // Xử lý lỗi
  }
});

exports.deleteProduct = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const product = await Product.findByPk(id);

  console.log(product);

  if (!product) {
    return res.status(404).json({ message: "Không tìm thấy sản phẩm này" });
  }

  try {
    // 2. Xóa hình ảnh chính của sản phẩm trên Firebase
    if (product.image) {
      // Đường dẫn của hình chính
      const imagePath = product.image.replace(
        "https://storage.googleapis.com/lamba-blog.appspot.com/",
        ""
      );
      await bucket.file(imagePath).delete();
      console.log(`Đã xóa hình ảnh chính: ${imagePath}`);
    }

    // 3. Tìm và xóa tất cả hình ảnh phụ trên Firebase
    const productImages = await Product_Image.findAll({
      where: { product_id: id },
    });

    for (const item of productImages) {
      if (item.url) {
        const imagePath = item.url.replace(
          "https://storage.googleapis.com/lamba-blog.appspot.com/",
          ""
        );
        // Đường dẫn file của hình phụ
        await bucket.file(imagePath).delete();
        console.log(`Đã xóa hình ảnh phụ: ${imagePath}`);
      }
    }

    // 4. Xóa dữ liệu hình ảnh phụ trong cơ sở dữ liệu
    await Product_Image.destroy({ where: { product_id: id } });

    // 5. Xóa sản phẩm khỏi cơ sở dữ liệu
    await product.destroy();

    return res.status(200).json({
      status: "success",
      message: "Xóa thành công",
    });
  } catch (error) {
    console.error("Lỗi khi xóa sản phẩm và hình ảnh:", error.message);
    res.status(500).json({
      status: "error",
      message: "Có lỗi xảy ra khi xóa sản phẩm và hình ảnh",
    });
  }
});
