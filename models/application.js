"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Application extends Model {
    static associate(models) {
      Application.belongsTo(models.ScholarshipSchema, {
        foreignKey: "schema_id",
        as: "schema",
      });

      Application.belongsTo(models.Student, {
        foreignKey: "student_id",
        as: "student",
      });

      Application.belongsTo(models.ScholarshipSchemaStudyProgram, {
        foreignKey: "schema_study_program_id",
        as: "schema_study_program",
      });

      Application.belongsTo(models.Staff, {
        foreignKey: "verified_by",
        as: "verificator",
      });

      Application.belongsTo(models.Staff, {
        foreignKey: "validated_by",
        as: "validator",
      });

      Application.belongsTo(models.Staff, {
        foreignKey: "rejected_by",
        as: "rejector",
      });

      Application.belongsTo(models.Staff, {
        foreignKey: "revision_requested_by",
        as: "revision_requester",
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
        allowNull: false,
      },
      schema_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "scholarship_schemas",
          key: "id",
        },
      },
      student_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "students",
          key: "id",
        },
      },
      schema_study_program_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "scholarship_schema_study_programs",
          key: "id",
        },
        comment: "Kombinasi skema dan program studi yang diizinkan",
      },
      status: {
        type: DataTypes.ENUM(
          "DRAFT",
          "MENUNGGU_VERIFIKASI",
          "VERIFIED",
          "REJECTED",
          "REVISION_NEEDED",
          "VALIDATED",
          "AWARDEE",
        ),
        allowNull: false,
        defaultValue: "DRAFT",
      },
      status_before_revision: {
        type: DataTypes.ENUM("MENUNGGU_VERIFIKASI", "VERIFIED"),
        allowNull: true,
        comment: "Status sebelum diminta revisi",
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      verified_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "staffs",
          key: "id",
        },
      },
      verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      validated_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "staffs",
          key: "id",
        },
      },
      validated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      rejected_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "staffs",
          key: "id",
        },
      },
      rejected_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      revision_requested_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "staffs",
          key: "id",
        },
      },
      revision_requested_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      revision_deadline: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      revision_submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Application",
      tableName: "applications",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["id", "schema_id"],
          name: "uq_applications_id_schema",
        },
      ],
    },
  );

  Application.afterUpdate(async (application, options) => {
    if (application.changed("status") && application.status === "VALIDATED") {
      const { ScholarshipSchemaStage, ApplicationStageProgress } =
        application.sequelize.models;

      const schema = await application.getSchema({
        include: [{ model: ScholarshipSchemaStage, as: "stages" }],
        transaction: options.transaction,
      });

      if (!schema || !schema.stages) return;

      await Promise.all(
        schema.stages.map((stage) =>
          ApplicationStageProgress.findOrCreate({
            where: {
              application_id: application.id,
              stage_id: stage.id,
            },
            defaults: {
              application_id: application.id,
              stage_id: stage.id,
              status:
                stage.order_no === 1 ? "SEDANG_BERLANGSUNG" : "BELUM_DIMULAI",
            },
            transaction: options.transaction,
          }),
        ),
      );
    }
  });

  return Application;
};
