const express = require("express");
const cartItemController = require("../controllers/cartItemController");
const authenticateJWT = require("../middlewares/auth");

const router = express.Router({ mergeParams: true });

// -----------BRAND ROUTE ---------------

// AUTHENTICATE JWT
router.use(authenticateJWT);
router
  .route("/")
  .get(cartItemController.getAllCartItem)
  .post(cartItemController.createCartItem);

// SINGLE
router
  .route("/:cartId")
  // .get(productCategoryController.getCategory)
  .patch(cartItemController.updateCartItem)
  .delete(cartItemController.deleteCartItem);

module.exports = router;
