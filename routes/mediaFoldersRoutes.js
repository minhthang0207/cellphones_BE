const express = require("express");
const mediaFoldersController = require("../controllers/mediaFoldersController");

const authenticateJWT = require("../middlewares/auth");
const { upload } = require("../utils/multer");

const router = express.Router();

// -----------MEDIA FOLDERS ROUTE ---------------

// AUTHENTICATE JWT
// router.use(authenticateJWT);

router
  .route("/")
  .get(mediaFoldersController.getFolders)
  .post(mediaFoldersController.createFolder);

router.post("/bulk-delete", mediaFoldersController.bulkDeleteFolders);

// Cập nhật thư mục
router.put("/:id", mediaFoldersController.updateFolder);

module.exports = router;
