const express = require("express");
const variantController = require("../controllers/variantController");
const authenticateJWT = require("../middlewares/auth");

const router = express.Router({ mergeParams: true });

// -----------BRAND ROUTE ---------------

// AUTHENTICATE JWT
router.use(authenticateJWT);
router
  .route("/")
  .get(variantController.getAllVariant)
  .post(variantController.createVariant);

// SINGLE
router
  .route("/:variantId")
  // .get(productCategoryController.getCategory)
  .patch(variantController.updateVariant)
  .delete(variantController.deleteVariant);

module.exports = router;
