"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BackupHistory extends Model {
    static associate(models) {
      BackupHistory.belongsTo(models.Staff, {
        foreignKey: "executed_by",
        as: "executor",
      });
    }
  }

  BackupHistory.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
      },
      executed_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "staffs",
          key: "id",
        },
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
      timestamps: true,
      updatedAt: false,
    },
  );

  return BackupHistory;
};
