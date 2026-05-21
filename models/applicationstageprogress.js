"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ApplicationStageProgress extends Model {
    static associate(models) {
      ApplicationStageProgress.belongsTo(models.Application, {
        foreignKey: "application_id",
        as: "application",
      });

      ApplicationStageProgress.belongsTo(models.ScholarshipSchemaStage, {
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
        allowNull: false,
      },
      application_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "applications",
          key: "id",
        },
      },
      stage_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "scholarship_schema_stages",
          key: "id",
        },
      },
      status: {
        type: DataTypes.ENUM(
          "BELUM_DIMULAI",
          "SEDANG_BERLANGSUNG",
          "SELESAI",
          "GAGAL",
        ),
        defaultValue: "BELUM_DIMULAI",
        allowNull: false,
      },
      started_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ApplicationStageProgress",
      tableName: "application_stage_progress",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["application_id", "stage_id"],
          name: "uq_application_stage_progress",
        },
      ],
    },
  );

  return ApplicationStageProgress;
};
