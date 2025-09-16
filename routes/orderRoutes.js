const express = require("express");
const orderController = require("../controllers/orderController");
const authenticateJWT = require("../middlewares/auth");

const router = express.Router({ mergeParams: true });

// -----------BRAND ROUTE ---------------

// AUTHENTICATE JWT
router.use(authenticateJWT);

router.route("/statistics/summary").get(orderController.getStatisticSummary);
router.route("/statistics/:year").get(orderController.getOrderStatistics);

router
  .route("/")
  .get(orderController.getAllOrder)
  .post(orderController.createOrder);

// SINGLE
router
  .route("/:orderId")
  .get(orderController.getOrder)
  .patch(orderController.updateOrder)
  .delete(orderController.deleteOrder);

module.exports = router;
