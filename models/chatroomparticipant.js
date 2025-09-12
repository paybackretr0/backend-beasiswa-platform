"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ChatRoomParticipant extends Model {
    static associate(models) {
      // ChatRoomParticipant belongs to ChatRoom
      ChatRoomParticipant.belongsTo(models.ChatRoom, { foreignKey: "room_id" });
      // ChatRoomParticipant belongs to User
      ChatRoomParticipant.belongsTo(models.User, { foreignKey: "user_id" });
    }
  }
  ChatRoomParticipant.init(
    {
      room_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        allowNull: false,
      },
      joined_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "ChatRoomParticipant",
      tableName: "chat_room_participants",
      timestamps: false,
    }
  );
  return ChatRoomParticipant;
};
