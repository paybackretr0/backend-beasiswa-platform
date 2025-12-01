"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ScholarshipStudyProgram extends Model {
    static associate(models) {
      ScholarshipStudyProgram.belongsTo(models.Scholarship, {
        foreignKey: "scholarship_id",
        as: "scholarship",
      });
      ScholarshipStudyProgram.belongsTo(models.StudyProgram, {
        foreignKey: "study_program_id",
        as: "study_program",
      });
    }
  }

  ScholarshipStudyProgram.init(
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
      study_program_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "ScholarshipStudyProgram",
      tableName: "scholarship_study_programs",
      timestamps: true,
    }
  );

  return ScholarshipStudyProgram;
};
