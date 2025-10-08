"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.Department, {
        foreignKey: "department_id",
        as: "department", // Add alias
      });
      User.belongsTo(models.Faculty, {
        foreignKey: "faculty_id",
        as: "faculty", // Add alias
      });
      User.hasMany(models.ActivityLog, { foreignKey: "user_id" });
      User.hasMany(models.BackupHistory, { foreignKey: "executed_by" });
      User.hasMany(models.Information, { foreignKey: "author_id" });
      User.hasMany(models.Notification, { foreignKey: "user_id" });
      User.hasMany(models.ChatMessage, { foreignKey: "sender_id" });
      User.hasMany(models.ChatRoomParticipant, { foreignKey: "user_id" });
      User.hasMany(models.Application, {
        foreignKey: "student_id",
        as: "student",
      });
      User.hasMany(models.Application, {
        foreignKey: "verified_by",
        as: "verificator",
      });
      User.hasMany(models.ApplicationDocument, {
        foreignKey: "checked_by",
        as: "checker",
      });
      User.hasMany(models.Scholarship, { foreignKey: "created_by" });
      User.hasMany(models.GovernmentScholarship, { foreignKey: "imported_by" });
      User.hasMany(models.RefreshToken, { foreignKey: "user_id" });
    }
  }
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
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
          "VERIFIKATOR",
          "PIMPINAN_DITMAWA",
          "PIMPINAN_FAKULTAS",
          "SUPERADMIN"
        ),
        allowNull: false,
        defaultValue: "MAHASISWA",
      },
      nim: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      faculty_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      department_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      phone_number: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      gender: {
        type: DataTypes.ENUM("L", "P"),
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
      timestamps: true, // createdAt & updatedAt otomatis
    }
  );
  return User;
};
