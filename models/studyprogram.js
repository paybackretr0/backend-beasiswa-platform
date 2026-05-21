"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class StudyProgram extends Model {
    static associate(models) {
      StudyProgram.belongsTo(models.Department, {
        foreignKey: "department_id",
        as: "department",
      });

      StudyProgram.hasMany(models.Student, {
        foreignKey: "study_program_id",
        as: "students",
      });

      StudyProgram.hasMany(models.ScholarshipSchemaStudyProgram, {
        foreignKey: "study_program_id",
        as: "schema_study_programs",
      });

      StudyProgram.belongsToMany(models.ScholarshipSchema, {
        through: models.ScholarshipSchemaStudyProgram,
        foreignKey: "study_program_id",
        otherKey: "schema_id",
        as: "scholarship_schemas",
      });
    }
  }

  StudyProgram.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
      },
      department_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "departments",
          key: "id",
        },
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      degree: {
        type: DataTypes.ENUM("D3", "D4", "S1", "S2", "S3", "Profesi"),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "StudyProgram",
      tableName: "study_programs",
      timestamps: true,
    },
  );

  return StudyProgram;
};
