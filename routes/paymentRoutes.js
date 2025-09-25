const express = require("express");
const paymentController = require("../controllers/paymentController");
const authenticateJWT = require("../middlewares/auth");

const router = express.Router();

// -----------BRAND ROUTE ---------------

// AUTHENTICATE JWT
router.use(authenticateJWT);
router.get("/query-order/:id", paymentController.getOrderStatus)

router.get("/query-refund/:mRefundId", paymentController.getRefundStatus)
router.post("/refund", paymentController.refundOrder)
router
  .route("/")
  //   .get(colorController.getAllColor)
  .post(paymentController.createPayment);

// SINGLE
// router
//   .route("/:id")
//   .get(colorController.getColor)
//   .patch(colorController.updateColor)
//   .delete(colorController.deleteColor);

module.exports = router;
