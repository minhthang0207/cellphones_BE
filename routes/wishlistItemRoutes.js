const express = require("express");
const wishlistItemController = require("../controllers/wishlistItemController");
const authenticateJWT = require("../middlewares/auth");

const router = express.Router({ mergeParams: true });

// -----------BRAND ROUTE ---------------

// AUTHENTICATE JWT
router.use(authenticateJWT);
router
  .route("/")
  .get(wishlistItemController.getAllWishlistItem)
  .post(wishlistItemController.createWishlistItem);

// SINGLE
router
  .route("/:wishListId")
  // .get(productCategoryController.getCategory)
  // .patch(wishlistItemController.updateCartItem)
  .delete(wishlistItemController.deleteWishListItem);

module.exports = router;
