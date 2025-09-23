"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ApplicationDocument extends Model {
    static associate(models) {
      // ApplicationDocument belongs to Application
      ApplicationDocument.belongsTo(models.Application, {
        foreignKey: "application_id",
      });
      // ApplicationDocument checked by User
      ApplicationDocument.belongsTo(models.User, {
        foreignKey: "checked_by",
        as: "checker",
      });
    }
  }
  ApplicationDocument.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      application_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      document_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      file_path: {
        type: DataTypes.STRING(512),
        allowNull: false,
      },
      mime_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      size_bytes: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      is_valid: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      checked_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      checked_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ApplicationDocument",
      tableName: "application_documents",
      timestamps: true, // createdAt otomatis, updatedAt tidak ada di migration
      updatedAt: false, // karena migration tidak punya updatedAt
    }
  );
  return ApplicationDocument;
};
