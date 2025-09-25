// controllers/chatController.js
const sequelize = require("../config/database");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message"); // Mô hình tin nhắn
const User = require("../models/User"); // Mô hình người dùng
const { Op, Sequelize } = require("sequelize");

// Route để lấy số lượng tin nhắn chưa đọc được gửi từ admin(user)
exports.getUnreadCountFromAdminToUser = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      where: { 
        user1_id: req.user.id,
      }
    });

    if(!conversation) {
      res.status(404).json({
        message: "Không tìm thấy đoạn hội thoại!"
      });
      return;
    }
    const unreadCount = await Message.count({
      where: {
        conversation_id: conversation.id,
        isRead: 0,
      }
    });

    res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
}

//Lấy tin nhắn giữa user và admin
exports.getMessageBetweenAdminAndUser = async (req, res, next) => {
  const { adminId, conversationId } = req.params;
  try {

    const adminInfo = await User.findOne({
        where: { id: adminId },
        attributes: ["id", "name", "avatar", "role"]
    });

    if(!adminInfo) {
      res.status(404).json({
        message: "Không tìm thấy admin"
      });
      return;
    }

    // 1. Kiểm tra conversation có tồn tại và admin có trong đó không
    const conversation = await Conversation.findOne({
      where: { id: conversationId },
      include: [
        { model: User, as: "user1", attributes: ["id", "name", "role", "avatar"] },
        { model: User, as: "user2", attributes: ["id", "name", "role", "avatar"] }
      ]
    });

    if (!conversation) {
      return res.status(404).json({ error: "Không tìm thấy đoạn hội thoại!" });
    }

    if (conversation.user1_id !== adminId && conversation.user2_id !== adminId) {
      return res.status(403).json({ error: "Admin does not belong to this conversation" });
    }

    // 2. Lấy tất cả messages trong conversation
    const messages = await Message.findAll({
      where: { conversation_id: conversationId },
      order: [["createdAt", "ASC"]] // tin nhắn từ cũ -> mới
    });
 
    res.status(200).json({ messages });

    return;
  } catch (error) {
    next(error);
  }
};


// Lấy các tin nhắn trong một cuộc hội thoại
exports.getMessages = async (req, res, next) => {
  const { userId } = req.params;
  try {

    const user = await User.findOne({
        where: { id: userId },
        attributes: ["id", "name", "avatar", "role"]
    });

    if(!user) {
      res.status(404).json({
        message: "Không tìm thấy user"
      });
      return;
    }

    // 1. Lấy admin mặc định
    const admin = await User.findOne({ where: { role: "admin" } });

    // 2. Tìm conversation user ↔ admin
    let conversation = await Conversation.findOne({
      where: {
        [Op.or]: [
          { user1_id: userId, user2_id: admin.id },
          { user1_id: admin.id, user2_id: userId },
        ],
      },
      include: [
        { model: User, as: "user1", attributes: ["id", "name", "role", "avatar"] },
        { model: User, as: "user2", attributes: ["id", "name", "role", "avatar"] },
        {
          model: Message,
          as: "lastMessage", // alias bạn định nghĩa trong associate()
          include: [
            { model: User, as: "sender", attributes: ["id", "name", "avatar", "role"] }
          ]
        },
        {
          model: Message,
          as: "messages"
        }
      ],
      order: [[{ model: Message, as: "messages" }, "createdAt", "ASC"]],
    });

    // 3. Nếu chưa có conversation → tạo mới
    // Người gửi là số 1 người nhận là 2
    // const user1_id = sender_id;
    // const user2_id = receiver_id;
    if (!conversation) {
      conversation = await Conversation.create({ user1_id: userId, user2_id: admin.id });
      // load lại fullConversation với include
      conversation = await Conversation.findOne({
        where: { id: conversation.id },
        include: [
          { model: User, as: "user1", attributes: ["id", "name", "role", "avatar"] },
          { model: User, as: "user2", attributes: ["id", "name", "role", "avatar"] },
          {
            model: Message,
            as: "lastMessage", // alias bạn định nghĩa trong associate(),
          },
          {
            model: Message,
            as: "messages",
            order: [["createdAt", "ASC"]],
          },
        ],
      });
    }

    res.status(200).json(conversation);
    return;
     
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách các cuộc hội thoại
exports.getRooms = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const admin = await User.findOne({
      where: { 
        id: adminId ,
        role: "admin",
      },
      attributes: ["id", "name", "role"]
    });

    if(!admin) {
      res.status(404).json({
        message: "Admin mới được truy cập"
      })
      return;
    };

    // Lấy danh sách các cuộc hội thoại trừ cuộc hội thoại mới tạo và chưa có tin nhắn
    const conversations = await Conversation.findAll({
      where: {
        [Op.or]: [{ user1_id: adminId }, { user2_id: adminId }],
        last_message_id: { [Op.ne]: null }
      },
      include: [
        // user1 và user2 trong room
        { model: User, as: "user1", attributes: ["id", "name", "role", "avatar"] },
        { model: User, as: "user2", attributes: ["id", "name", "role", "avatar"] },

        // lastMessage để show preview tin nhắn cuối
        {
          model: Message,
          as: "lastMessage"
        }
      ],
      order: [["updatedAt", "DESC"]] // phòng có tin nhắn mới nhất sẽ ở trên cùng
    });

    res.status(200).json({ rooms: conversations || [] });
  } catch (error) {
    next(error);
  }
};

// Gửi tin nhắn mới
exports.sendMessage = async (req, res, next) => {
  const { senderId, receiverId, content, conversationId } = req.body;

  try {
    // Lưu tin nhắn vào DB
    const newMessage = await Message.create({
      senderId,
      receiverId,
      content,
      conversationId,
      isRead: false,
    });

    // Gửi tin nhắn đến người nhận qua socket.io
    req.io.to(receiverId).emit("receive_message", newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    next(error);
  }
};
