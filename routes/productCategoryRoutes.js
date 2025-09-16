const express = require("express");
const productCategoryController = require("../controllers/productCategoryController");
const authenticateJWT = require("../middlewares/auth");

const router = express.Router();

// -----------BRAND ROUTE ---------------

// AUTHENTICATE JWT
router.use(authenticateJWT);
router
  .route("/")
  .get(productCategoryController.getAllCategory)
  .post(productCategoryController.createCategory);

// SINGLE
router
  .route("/:id")
  .get(productCategoryController.getCategory)
  .patch(productCategoryController.updateCategory)
  .delete(productCategoryController.deleteCategory);

module.exports = router;
