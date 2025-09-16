const path = require("path");
const express = require("express");
const sequelize = require("./config/database"); // Gọi file database.js để kết nối DB

const http = require("http");
const { Server } = require("socket.io");

const app = express();
const cors = require("cors");

// Setup CORS middleware for general HTTP requests
app.use(
  cors({
    origin: process.env.FRONTEND_URL, // Allow requests from frontend
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
    credentials: true, // Allow cookies or auth headers if needed
  })
);


// Router
const userRouter = require("./routes/userRoutes");
const brandRouter = require("./routes/brandRoutes");
const ramRouter = require("./routes/ramRoutes");
const romRouter = require("./routes/romRoutes");
const colorRouter = require("./routes/colorRoutes");
const productCategoryRouter = require("./routes/productCategoryRoutes");
const productRouter = require("./routes/productRoutes");
const productImageRouter = require("./routes/productImageRoutes");
const variantRouter = require("./routes/variantRoutes");
const cartItemRouter = require("./routes/cartItemRoutes");
const wishlistItemRouter = require("./routes/wishlistItemRoutes");
const paymentRouter = require("./routes/paymentRoutes");
const orderRouter = require("./routes/orderRoutes");
const reviewRouter = require("./routes/reviewRoutes");
const chatRouter = require("./routes/chatRoutes");

const paymentController = require("./controllers/paymentController");

// Controller
const globalErrorHandler = require("./controllers/errorController");
const Message = require("./models/Message");
const User = require("./models/User");
const { Op, Sequelize } = require("sequelize");
const Conversation = require("./models/Conversation");

// Serving static file
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Create HTTP server and integrate with Socket.IO
const server = http.createServer(app);

// Create Socket.IO instance with additional CORS configuration
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL, // Allow requests from frontend
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], // Allowed methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
    credentials: true, // Allow credentials (cookies or authentication headers)
  },
});

require("./models/index");

// socket.io
io.on("connection", (socket) => {

  // ----------USER-----------

  // Người dùng tham gia vào một phòng (room) theo ID người dùng
  socket.on("join_room", (userId) => {
    socket.join(userId);
    socket.data.userId = userId;
  });

  // Lắng nghe sự kiện gửi tin nhắn từ người dùng
  socket.on("send_message", async (messageData) => {
    const { sender_id, content, conversation_id } = messageData;
    let firstConversation = false;

    const admin = await User.findOne({
      where: { role: "admin" },
      attributes: ["id", "name", "role", "avatar"]
    });

    let receiver_id = admin.id;

    // Tạo mới conversation nếu chưa có
    let conversation = await Conversation.findOne({ where: { id: conversation_id }});
    if(!conversation.last_message_id) {
      firstConversation = true;
    }

    // Đây là admin
    if(sender_id === admin.id) {
      receiver_id = conversation.user1_id;
    }

    // Luư message
    const message = await Message.create({
      sender_id,
      receiver_id,
      content,
      conversation_id: conversation.id,
    });

    conversation.last_message_id = message.id;
    await conversation.save();

    

    if(firstConversation) {
      const newRoom = await Conversation.findOne({
        where: {
          id: conversation.id
        },
        include: [
          // user1 và user2 trong room
          { model: User, as: "user1", attributes: ["id", "name", "role", "avatar"] },
          { model: User, as: "user2", attributes: ["id", "name", "role", "avatar"] },
  
          // lastMessage để show preview tin nhắn cuối
          {
            model: Message,
            as: "lastMessage",
          }
        ],
      });

      io.to(receiver_id).emit("new_room", newRoom);
      io.to(sender_id).emit("new_message", message);
    } else {
      // Gửi tin nhắn mới cho cả người nhận và người gửi
      io.to(sender_id).emit("new_message", message);
      io.to(receiver_id).emit("new_message", message);
    }
  });

  // Lắng nghe sự kiện đánh dấu tin nhắn là đã đọc
  socket.on("mark_as_read", async (messageIds) => {
  if (!Array.isArray(messageIds) || messageIds.length === 0) return;

    const messages = await Message.findAll({ where: { id: messageIds } });

    if (messages.length > 0) {
      // cập nhật trạng thái isRead = true
      await Promise.all(
        messages.map((m) => {
          m.isRead = true;
          return m.save();
        })
      );

    // lấy danh sách id và danh sách sender cần thông báo
    const updatedIds = messages.map((m) => m.id);
    const senderIds = [...new Set(messages.map((m) => m.sender_id))];
    const receiverIds = [...new Set(messages.map((m) => m.receiver_id))];

    // emit cho người gửi và người nhận tin
    senderIds.forEach((senderId) => {
      io.to(senderId).emit("messages_read", { ids: updatedIds });
    });
    receiverIds.forEach((receiverId) => {
      io.to(receiverId).emit("messages_read", { ids: updatedIds });
    });
  }
});

  // ----------disconent-----------
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

// API để gửi và nhận tin nhắn (trang Admin và User có thể truy cập qua REST API)
app.get("/messages/:userId", async (req, res) => {
  const { userId } = req.params;
  const messages = await Message.findAll({
    where: {
      [Op.or]: [{ sender_id: userId }, { receiver_id: userId }],
    },
    include: [
      { model: User, as: "sender" },
      { model: User, as: "receiver" },
    ],
    order: [["createdAt", "ASC"]], // Lấy thông tin người gửi và người nhận
  });

  // Nếu không có tin nhắn, tạo một tin nhắn từ admin
  if (messages.length === 0) {
    // Tìm user có quyền admin
    const admin = await User.findOne({
      where: { role: "admin" }, // Giả sử role của admin là "admin"
    });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const adminId = admin.id; // Lấy id của admin

    // Tạo tin nhắn từ admin gửi cho user
    const welcomeMessage = await Message.create({
      sender_id: adminId,
      receiver_id: userId,
      content: "Xin chào, bạn cần gì?",
      isRead: false,
    });

    // Bao gồm thông tin người gửi và người nhận
    const populatedMessage = await Message.findByPk(welcomeMessage.id, {
      include: [
        { model: User, as: "sender" },
        { model: User, as: "receiver" },
      ],
      order: [["createdAt", "ASC"]],
    });

    return res.json([populatedMessage]);
  }
  res.json(messages);
});

// API để lấy tất cả tin nhắn giữa hai người dùng (admin và user)
app.get("/api/messages", async (req, res) => {
  const { senderId, receiverId } = req.query;

  try {
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          {
            sender_id: senderId,
            receiver_id: receiverId,
          },
          {
            sender_id: receiverId,
            receiver_id: senderId,
          },
        ],
      },
      include: [
        { model: User, as: "sender" },
        { model: User, as: "receiver" },
      ],
      order: [["createdAt", "ASC"]],
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Error fetching messages" });
  }
});

// API để lấy danh sách các cuộc trò chuyện (rooms) của admin
app.get("/api/rooms", async (req, res) => {
  const adminId = req.query.adminId; // Lấy adminId từ query params

  try {
    const rooms = await Message.findAll({
      where: {
        receiver_id: adminId, // admin là người nhận
      },
      attributes: [
        "sender_id", // Lấy sender_id
        "receiver_id", // Lấy receiver_id
        [
          Sequelize.literal(`
        CASE 
          WHEN COUNT(CASE WHEN Message.isRead = false THEN 1 END) > 0 
          THEN false 
          ELSE true 
        END
      `),
          "isRead",
        ], // Gán isRead=false nếu có tin nhắn chưa đọc
      ],
      include: [
        {
          model: User,
          as: "sender", // Lấy thông tin người gửi
          attributes: ["id", "name", "avatar"], // Chỉ lấy id và name của người gửi
        },
        {
          model: User,
          as: "receiver", // Lấy thông tin người nhận
          attributes: ["id", "name", "avatar"], // Chỉ lấy id và name của người nhận
        },
      ],
      group: ["sender_id", "receiver_id"], // Nhóm theo từng cặp sender_id, receiver_id
    });
    res.json(rooms); // Trả về danh sách các phòng chat (gồm sender_id, receiver_id, lastMessageTime, unreadMessagesCount)
  } catch (error) {
    console.error("Error fetching rooms:", error);
    res.status(500).json({ error: "Error fetching rooms" });
  }
});

// user
app.use("/api/users", userRouter);

// chat
app.use("/api/chats", chatRouter)

// atrribute
app.use("/api/brands", brandRouter);
app.use("/api/rams", ramRouter);
app.use("/api/roms", romRouter);
app.use("/api/colors", colorRouter);
app.use("/api/product_categories", productCategoryRouter);

// product
app.use("/api/products", productRouter);
// review
app.use("/api/reviews", reviewRouter);
// product_image
app.use("/api/product_image", productImageRouter);
// variant
app.use("/api/variants", variantRouter);
// cart_item
app.use("/api/carts", cartItemRouter);
// wishlist_item
app.use("/api/wishlists", wishlistItemRouter);
// order
app.use("/api/orders", orderRouter);
// payment
app.use("/api/payment", paymentRouter);
app.post("/api/callback", paymentController.callback);

app.use(globalErrorHandler);

// Connect Database
const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    // Create table (or sync if have table)
    // await sequelize.sync({ alter: true });
    await sequelize.sync();
    console.log("Connection database has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};

initializeDatabase();

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
