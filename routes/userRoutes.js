const express = require("express");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");
const authenticateJWT = require("../middlewares/auth");
const cartItemRoutes = require("../routes/cartItemRoutes");
const orderRoutes = require("../routes/orderRoutes");
const wishlistItemRoutes = require("../routes/wishlistItemRoutes");

const router = express.Router();

// -----------USER ROUTE ---------------

router.route("/signup").post(authController.signup);
router.route("/login").post(authController.login);
router.route("/generateOTP").post(authController.generateOTP);
router.route("/verifyOTP").post(authController.verifyOTP);

// forgot password
router.route("/forgotPassword").post(authController.forgotPassword);
router.route("/resetPassword").post(authController.resetPassword);

// AUTHENTICATE JWT
router.use(authenticateJWT);
// route wishlist item
router.use("/:userId/wishlists", wishlistItemRoutes);

// route cart item
router.use("/:userId/carts", cartItemRoutes);
// route order item
router.use("/:userId/orders", orderRoutes);

router.route("/me").get(userController.getUserProfile);
router.route("/updateProfile").patch(userController.updateUserProfile);
router.route("/updateLocation").patch(userController.updateUserLocation);

// -----------ADMIN ROUTE ---------------
router.route("/").get(userController.getAllUsers);
router
  .route("/:userId")
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
