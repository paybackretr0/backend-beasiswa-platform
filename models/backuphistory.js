"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class BackupHistory extends Model {
    static associate(models) {
      // BackupHistory belongs to User (executed_by)
      BackupHistory.belongsTo(models.User, { foreignKey: "executed_by" });
    }
  }
  BackupHistory.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      executed_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      storage_target: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      file_path: {
        type: DataTypes.STRING(512),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("SUCCESS", "FAILED"),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "BackupHistory",
      tableName: "backup_histories",
      timestamps: true, // hanya ada createdAt
      updatedAt: false,
    }
  );
  return BackupHistory;
};
