"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Application extends Model {
    static associate(models) {
      Application.belongsTo(models.Scholarship, {
        foreignKey: "scholarship_id",
        as: "scholarship",
      });
      Application.belongsTo(models.User, {
        foreignKey: "student_id",
        as: "student",
      });
      Application.belongsTo(models.User, {
        foreignKey: "verified_by",
        as: "verificator",
      });
      Application.hasMany(models.ApplicationDocument, {
        foreignKey: "application_id",
      });
      Application.hasMany(models.FormAnswer, { foreignKey: "application_id" });
      Application.hasMany(models.ApplicationStageProgress, {
        foreignKey: "application_id",
        as: "stages_progress",
      });
    }
  }
  Application.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      scholarship_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      student_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          "DRAFT",
          "MENUNGGU_VERIFIKASI",
          "VERIFIED",
          "MENUNGGU_VALIDASI",
          "REJECTED",
          "VALIDATED"
        ),
        allowNull: false,
        defaultValue: "DRAFT",
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      verified_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      score_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Application",
      tableName: "applications",
      timestamps: true,
    }
  );
  Application.afterUpdate(async (application, options) => {
    if (application.changed("status") && application.status === "VALIDATED") {
      const scholarship = await application.getScholarship({
        include: [
          { model: options.sequelize.models.ScholarshipStage, as: "stages" },
        ],
      });

      if (!scholarship || !scholarship.stages) return;

      const progressModel = options.sequelize.models.ApplicationStageProgress;

      await Promise.all(
        scholarship.stages.map((stage) =>
          progressModel.create({
            application_id: application.id,
            stage_id: stage.id,
            status:
              stage.order_no === 1 ? "SEDANG_BERLANGSUNG" : "BELUM_DIMULAI",
          })
        )
      );
    }
  });

  return Application;
};
