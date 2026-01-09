"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Application extends Model {
    static associate(models) {
      Application.belongsTo(models.ScholarshipSchema, {
        foreignKey: "schema_id",
        as: "schema",
      });
      Application.belongsTo(models.User, {
        foreignKey: "student_id",
        as: "student",
      });
      Application.belongsTo(models.User, {
        foreignKey: "verified_by",
        as: "verificator",
      });
      Application.belongsTo(models.User, {
        foreignKey: "validated_by",
        as: "validator",
      });
      Application.belongsTo(models.User, {
        foreignKey: "rejected_by",
        as: "rejector",
      });
      Application.hasMany(models.ApplicationDocument, {
        foreignKey: "application_id",
        as: "documents",
      });
      Application.hasMany(models.FormAnswer, {
        foreignKey: "application_id",
        as: "formAnswers",
      });
      Application.hasMany(models.ApplicationStageProgress, {
        foreignKey: "application_id",
        as: "stageProgress",
      });
      Application.hasMany(models.ApplicationComment, {
        foreignKey: "application_id",
        as: "comments",
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
      schema_id: {
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
          "REJECTED",
          "REVISION_NEEDED",
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
      validated_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      validated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      rejected_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      rejected_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Catatan internal (tidak ditampilkan ke mahasiswa)",
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
      const { ScholarshipSchemaStage, ApplicationStageProgress } =
        application.sequelize.models;

      const schema = await application.getSchema({
        include: [{ model: ScholarshipSchemaStage, as: "stages" }],
      });

      if (!schema || !schema.stages) return;

      await Promise.all(
        schema.stages.map((stage) =>
          ApplicationStageProgress.create({
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
