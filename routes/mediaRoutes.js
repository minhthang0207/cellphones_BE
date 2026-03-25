const express = require("express");
const mediaController = require("../controllers/mediaController");

const authenticateJWT = require("../middlewares/auth");
const { upload } = require("../utils/multer");

const router = express.Router();

// -----------MEDIA ROUTE ---------------

// AUTHENTICATE JWT
// router.use(authenticateJWT);

router.route("/").get(mediaController.getMediaList);

// upload nhiều hình ảnh
router.post(
  "/bulk-upload",
  // upload.array("files", 20),
  upload.fields([
    { name: "media_images", maxCount: 20 }, // Hình ảnh chính
  ]),
  mediaController.uploadMultipleMedia,
);

// di chuyển hình ảnh và thư mục
router.post("/cut", mediaController.bulkMove);

// Copy hình ảnh và thư mục
router.post("/copy", mediaController.bulkCopy);

// Xóa nhiều hình ảnh
router.post("/bulk-delete", mediaController.deleteMultipleMedia);

// Đổi tên hình ảnh
router.put("/:id", mediaController.updateMedia);

module.exports = router;
