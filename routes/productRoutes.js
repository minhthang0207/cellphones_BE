const express = require("express");
const productController = require("../controllers/productController");
const productImageRoutes = require("../routes/productImageRoutes");
const variantRoutes = require("../routes/variantRoutes");
const reviewRoutes = require("../routes/reviewRoutes");
const authenticateJWT = require("../middlewares/auth");
const { upload } = require("../utils/multer");

const router = express.Router();

// -----------BRAND ROUTE ---------------

// AUTHENTICATE JWT
// router.use(authenticateJWT);

// Route mới để tìm kiếm sản phẩm theo slug
router.route("/slug/:slug").get(productController.getProductBySlug);

router
  .route("/top-30-outstanding")
  .get(
    productController.aliasTopOutstandingProduct,
    productController.getAllProduct
  );

router.get("/landing", productController.getLandingProducts)

// ---------Hình ảnh-------------
// Thêm danh sách hình ảnh vào sản phẩm
router.use("/:productId/images", productImageRoutes);

// Thêm danh sách biến thể vào sản phẩm
router.use("/:productId/variants", variantRoutes);

// Thêm bình luận vào sản phẩm
router.use("/:productId/reviews", reviewRoutes);

router
  .route("/")
  .get(productController.getAllProduct)
  .post(
    upload.fields([
      { name: "product_image", maxCount: 1 }, // Hình ảnh chính
      { name: "product_images", maxCount: 10 }, // Hình ảnh phụ
    ]),
    productController.createProduct
  );

// SINGLE

// Lấy thông tin của sản phẩm (Không có biến thể)
router.route("/:id/info").get(productController.getProductInfo);

router
  .route("/:id")
  .get(productController.getProductWithAllAttribute)
  .patch(
    upload.fields([
      { name: "product_image", maxCount: 1 }, // Hình ảnh chính
      { name: "product_images", maxCount: 10 }, // Hình ảnh phụ
    ]),
    productController.updateProduct
  )
  .delete(productController.deleteProduct);

module.exports = router;
