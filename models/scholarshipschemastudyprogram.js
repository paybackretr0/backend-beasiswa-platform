"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ScholarshipSchemaStudyProgram extends Model {
    static associate(models) {
      ScholarshipSchemaStudyProgram.belongsTo(models.ScholarshipSchema, {
        foreignKey: "schema_id",
        as: "schema",
      });

      ScholarshipSchemaStudyProgram.belongsTo(models.StudyProgram, {
        foreignKey: "study_program_id",
        as: "study_program",
      });

      ScholarshipSchemaStudyProgram.hasMany(models.Application, {
        foreignKey: "schema_study_program_id",
        as: "applications",
      });
    }
  }

  ScholarshipSchemaStudyProgram.init(
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
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      study_program_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "study_programs",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
    },
    {
      sequelize,
      modelName: "ScholarshipSchemaStudyProgram",
      tableName: "scholarship_schema_study_programs",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["schema_id", "study_program_id"],
          name: "uq_schema_study_program",
        },
        {
          unique: true,
          fields: ["id", "schema_id"],
          name: "uq_schema_study_program_id_schema",
        },
        {
          unique: true,
          fields: ["id", "study_program_id"],
          name: "uq_schema_study_program_id_study_program",
        },
      ],
    },
  );

  return ScholarshipSchemaStudyProgram;
};
