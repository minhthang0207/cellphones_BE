const express = require("express");
const brandController = require("../controllers/brandController");
const authenticateJWT = require("../middlewares/auth");

const router = express.Router();

// -----------BRAND ROUTE ---------------

// AUTHENTICATE JWT
router.use(authenticateJWT);
router
  .route("/")
  .get(brandController.getAllBrand)
  .post(brandController.createBrand);

// SINGLE
router
  .route("/:id")
  .get(brandController.getBrand)
  .patch(brandController.updateBrand)
  .delete(brandController.deleteBrand);

module.exports = router;
