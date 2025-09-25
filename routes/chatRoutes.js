// routes/chatRoutes.js
const express = require("express");
const router = express.Router();
const {
  getRooms,
  getMessages,
  getMessageBetweenAdminAndUser,
  getUnreadCountFromAdminToUser
} = require("../controllers/chatController");
const authenticateJWT = require("../middlewares/auth");

// AUTHENTICATE JWT
router.use(authenticateJWT);
// --------USER---------
// Route để lấy số lượng tin nhắn chưa đọc được gửi từ admin(user)
router.get("/unread-count", getUnreadCountFromAdminToUser);

// Route để lấy tin nhắn của một cuộc hội thoại (user)
router.get("/:userId", getMessages);

// --------ADMIN---------
// Route để lấy danh sách các cuộc hội thoại cua admin
router.get("/admin/:adminId/rooms", getRooms);

// Route để lấy tin nhắn giữa user và admin
router.get("/admin/:adminId/rooms/:conversationId/messages", getMessageBetweenAdminAndUser);

module.exports = router;
