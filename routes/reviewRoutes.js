const express = require("express");
const productReviewsController = require("../controllers/productReviewsController");
const authenticateJWT = require("../middlewares/auth");

const router = express.Router({ mergeParams: true });

// -----------BRAND ROUTE ---------------

// AUTHENTICATE JWT
router
  .route("/")
  .get(productReviewsController.getProductReviews)
  .post(productReviewsController.createsReview);

// SINGLE
router.use(authenticateJWT);

router
  .route("/:reviewId")
  // .get(romController.getRom)
  // .patch(romController.updateRom)
  .delete(productReviewsController.deleteReview);

module.exports = router;
