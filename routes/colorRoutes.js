const express = require("express");
const colorController = require("../controllers/colorController");
const authenticateJWT = require("../middlewares/auth");

const router = express.Router();

// -----------BRAND ROUTE ---------------

// AUTHENTICATE JWT
router.use(authenticateJWT);
router
  .route("/")
  .get(colorController.getAllColor)
  .post(colorController.createColor);

// SINGLE
router
  .route("/:id")
  .get(colorController.getColor)
  .patch(colorController.updateColor)
  .delete(colorController.deleteColor);

module.exports = router;
