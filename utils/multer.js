const multer = require("multer");

// Cấu hình Multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Export object chứa upload
module.exports = { upload };
