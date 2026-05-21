"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ChatRoom extends Model {
    static associate(models) {
      ChatRoom.hasMany(models.ChatRoomParticipant, { foreignKey: "room_id" });
      ChatRoom.hasMany(models.ChatMessage, { foreignKey: "room_id" });
    }
  }
  ChatRoom.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      is_group_chat: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "ChatRoom",
      tableName: "chat_rooms",
      timestamps: true,
    },
  );
  return ChatRoom;
};
