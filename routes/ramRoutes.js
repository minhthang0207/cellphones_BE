const express = require("express");
const ramController = require("../controllers/ramController");
const authenticateJWT = require("../middlewares/auth");

const router = express.Router();

// -----------BRAND ROUTE ---------------

// AUTHENTICATE JWT
router.use(authenticateJWT);
router.route("/").get(ramController.getAllRam).post(ramController.createRam);

// SINGLE
router
  .route("/:id")
  .get(ramController.getRam)
  .patch(ramController.updateRam)
  .delete(ramController.deleteRam);

module.exports = router;
