const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

const Conversation = sequelize.define(
  "Conversation",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user1_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    user2_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    last_message_id: {
      type: DataTypes.UUID,
      defaultValue: null,
    },
  },
  {
    tableName: "conversation",
    timestamps: true,
  }
);

Conversation.associate = (models) => {
  Conversation.belongsTo(models.User, { foreignKey: "user1_id", as: "user1" });
  Conversation.belongsTo(models.User, { foreignKey: "user2_id", as: "user2" });
  Conversation.belongsTo(models.Message, { foreignKey: "last_message_id", as: "lastMessage" });
  Conversation.hasMany(models.Message, { foreignKey: "conversation_id", as: "messages" });
};

module.exports = Conversation;
