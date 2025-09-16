// routes/chatRoutes.js
const express = require("express");
const router = express.Router();
const {
  getRooms,
  getMessages,
  getMessageBetweenAdminAndUser,
  markAsRead,
} = require("../controllers/chatController");
const authenticateJWT = require("../middlewares/auth");

// AUTHENTICATE JWT
// router.use(authenticateJWT);

// Route để lấy tin nhắn của một cuộc hội thoại (user)
router.get("/:userId", getMessages);

// Route để lấy danh sách các cuộc hội thoại cua admin
router.get("/admin/:adminId/rooms", getRooms);

// Route để lấy tin nhắn giữa user và admin
router.get("/admin/:adminId/rooms/:conversationId/messages", getMessageBetweenAdminAndUser);

// Route để đánh dấu tin nhắn là đã đọc
router.post("/mark_as_read", markAsRead);

module.exports = router;
