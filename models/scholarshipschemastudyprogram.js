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
    }
  }

  ScholarshipSchemaStudyProgram.init(
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
      study_program_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "ScholarshipSchemaStudyProgram",
      tableName: "scholarship_schema_study_programs",
      timestamps: true,
    },
  );

  return ScholarshipSchemaStudyProgram;
};
