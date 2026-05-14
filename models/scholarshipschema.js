"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ScholarshipSchema extends Model {
    static associate(models) {
      ScholarshipSchema.belongsTo(models.Scholarship, {
        foreignKey: "scholarship_id",
        as: "scholarship",
      });

      ScholarshipSchema.hasMany(models.FormField, {
        foreignKey: "schema_id",
        as: "formFields",
      });

      ScholarshipSchema.hasMany(models.ScholarshipSchemaFaculty, {
        foreignKey: "schema_id",
        as: "scholarshipSchemaFaculties",
      });
      ScholarshipSchema.hasMany(models.ScholarshipSchemaDepartment, {
        foreignKey: "schema_id",
        as: "scholarshipSchemaDepartments",
      });
      ScholarshipSchema.hasMany(models.ScholarshipSchemaStudyProgram, {
        foreignKey: "schema_id",
        as: "scholarshipSchemaStudyPrograms",
      });

      ScholarshipSchema.belongsToMany(models.Faculty, {
        through: models.ScholarshipSchemaFaculty,
        foreignKey: "schema_id",
        otherKey: "faculty_id",
        as: "faculties",
      });

      ScholarshipSchema.belongsToMany(models.Department, {
        through: models.ScholarshipSchemaDepartment,
        foreignKey: "schema_id",
        otherKey: "department_id",
        as: "departments",
      });

      ScholarshipSchema.belongsToMany(models.StudyProgram, {
        through: models.ScholarshipSchemaStudyProgram,
        foreignKey: "schema_id",
        otherKey: "study_program_id",
        as: "studyPrograms",
      });

      ScholarshipSchema.hasMany(models.ScholarshipSchemaRequirement, {
        foreignKey: "schema_id",
        as: "requirements",
      });

      ScholarshipSchema.hasMany(models.ScholarshipSchemaDocument, {
        foreignKey: "schema_id",
        as: "documents",
      });

      ScholarshipSchema.hasMany(models.ScholarshipSchemaStage, {
        foreignKey: "schema_id",
        as: "stages",
      });

      ScholarshipSchema.hasMany(models.Application, {
        foreignKey: "schema_id",
        as: "applications",
      });
    }
  }
  ScholarshipSchema.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      scholarship_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(191),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      quota: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      gpa_minimum: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
      },
      semester_minimum: {
        type: DataTypes.INTEGER,
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
      modelName: "ScholarshipSchema",
      tableName: "scholarship_schemas",
      timestamps: true,
    },
  );
  return ScholarshipSchema;
};
