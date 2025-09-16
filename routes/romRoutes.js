const express = require("express");
const romController = require("../controllers/romController");
const authenticateJWT = require("../middlewares/auth");

const router = express.Router();

// -----------BRAND ROUTE ---------------

// AUTHENTICATE JWT
router.use(authenticateJWT);
router.route("/").get(romController.getAllRom).post(romController.createRom);

// SINGLE
router
  .route("/:id")
  .get(romController.getRom)
  .patch(romController.updateRom)
  .delete(romController.deleteRom);

module.exports = router;
