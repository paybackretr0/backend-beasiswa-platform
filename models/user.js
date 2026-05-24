"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasOne(models.Student, {
        foreignKey: "id",
        as: "student",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      User.hasOne(models.Staff, {
        foreignKey: "id",
        as: "staff",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      User.hasMany(models.ActivityLog, { foreignKey: "user_id" });
      User.hasMany(models.BackupHistory, { foreignKey: "executed_by" });
      User.hasMany(models.Notification, { foreignKey: "user_id" });
      User.hasMany(models.ChatMessage, { foreignKey: "sender_id" });
      User.hasMany(models.ChatRoomParticipant, { foreignKey: "user_id" });
      User.hasMany(models.RefreshToken, { foreignKey: "user_id" });
    }
  }
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING(191),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      full_name: {
        type: DataTypes.STRING(191),
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM(
          "MAHASISWA",
          "VERIFIKATOR_FAKULTAS",
          "VERIFIKATOR_DITMAWA",
          "VALIDATOR_DITMAWA",
          "PIMPINAN_DITMAWA",
          "PIMPINAN_FAKULTAS",
          "SUPERADMIN",
        ),
        allowNull: false,
        defaultValue: "MAHASISWA",
      },
      phone_number: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      emailVerificationCode: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      emailVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      resetPasswordCode: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      resetPasswordExpires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users",
      timestamps: true,
    },
  );

  return User;
};
