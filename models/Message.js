const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

const Message = sequelize.define(
  "Message",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // Sử dụng UUIDV4 cho giá trị mặc định
      primaryKey: true,
    },
    sender_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    receiver_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false, // Tin nhắn mặc định là chưa đọc
    },
  },
  {
    tableName: "message",
    timestamps: true,
  }
);

Message.associate = (models) => {
  Message.belongsTo(models.User, { foreignKey: "sender_id", as: "sender" }); // A message belongs to a sender (User)
  Message.belongsTo(models.User, { foreignKey: "receiver_id", as: "receiver" }); // A message belongs to a receiver (User)
  Message.belongsTo(models.Conversation, { foreignKey: "conversation_id", as: "conversation" });
};

module.exports = Message;
