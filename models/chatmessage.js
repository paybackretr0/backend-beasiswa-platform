"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ChatMessage extends Model {
    static associate(models) {
      // ChatMessage belongs to ChatRoom
      ChatMessage.belongsTo(models.ChatRoom, { foreignKey: "room_id" });
      // ChatMessage belongs to User (sender)
      ChatMessage.belongsTo(models.User, {
        foreignKey: "sender_id",
        as: "sender",
      });
    }
  }
  ChatMessage.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      room_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      sender_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      sent_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      read_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ChatMessage",
      tableName: "chat_messages",
      timestamps: false,
    }
  );
  return ChatMessage;
};
