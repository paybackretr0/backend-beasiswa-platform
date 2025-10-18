"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ApplicationStageProgress extends Model {
    static associate(models) {
      ApplicationStageProgress.belongsTo(models.Application, {
        foreignKey: "application_id",
        as: "application",
      });
      ApplicationStageProgress.belongsTo(models.ScholarshipStage, {
        foreignKey: "stage_id",
        as: "stage",
      });
    }
  }

  ApplicationStageProgress.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      application_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      stage_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          "BELUM_DIMULAI",
          "SEDANG_BERLANGSUNG",
          "SELESAI",
          "GAGAL"
        ),
        defaultValue: "BELUM_DIMULAI",
        allowNull: false,
      },
      started_at: DataTypes.DATE,
      completed_at: DataTypes.DATE,
      notes: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: "ApplicationStageProgress",
      tableName: "application_stage_progress",
    }
  );

  return ApplicationStageProgress;
};
