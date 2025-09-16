const express = require("express");
const productImageController = require("../controllers/productImageController");
const authenticateJWT = require("../middlewares/auth");
const { upload } = require("../utils/multer");

const router = express.Router({ mergeParams: true });

// -----------BRAND ROUTE ---------------

// AUTHENTICATE JWT
// router.use(authenticateJWT);
router
  .route("/")
  .get(productImageController.getAllProductImage)
  .post(productImageController.createProductImage);

// SINGLE
router
  .route("/:imageId")
  // .get(productCategoryController.getCategory)
  .patch(
    upload.single("product_image"),
    productImageController.updateProductImage
  )
  .delete(productImageController.deleteProductImage);

module.exports = router;
