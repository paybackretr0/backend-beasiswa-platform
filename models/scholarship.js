"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Scholarship extends Model {
    static associate(models) {
      Scholarship.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });

      Scholarship.hasMany(models.ScholarshipSchema, {
        foreignKey: "scholarship_id",
        as: "schemas",
      });
      Scholarship.hasMany(models.ScholarshipFaculty, {
        foreignKey: "scholarship_id",
        as: "scholarshipFaculties",
      });
      Scholarship.hasMany(models.ScholarshipDepartment, {
        foreignKey: "scholarship_id",
        as: "scholarshipDepartments",
      });
      Scholarship.hasMany(models.ScholarshipStudyProgram, {
        foreignKey: "scholarship_id",
        as: "scholarshipStudyPrograms",
      });
      Scholarship.hasMany(models.ScholarshipBenefit, {
        foreignKey: "scholarship_id",
        as: "benefits",
      });

      Scholarship.belongsToMany(models.Faculty, {
        through: models.ScholarshipFaculty,
        foreignKey: "scholarship_id",
        otherKey: "faculty_id",
        as: "faculties",
      });

      Scholarship.belongsToMany(models.Department, {
        through: models.ScholarshipDepartment,
        foreignKey: "scholarship_id",
        otherKey: "department_id",
        as: "departments",
      });

      Scholarship.belongsToMany(models.StudyProgram, {
        through: models.ScholarshipStudyProgram,
        foreignKey: "scholarship_id",
        otherKey: "study_program_id",
        as: "studyPrograms",
      });
    }
  }
  Scholarship.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING(191),
        allowNull: false,
      },
      organizer: {
        type: DataTypes.STRING(191),
        allowNull: true,
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quota: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      is_external: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      verification_level: {
        type: DataTypes.ENUM("FACULTY", "DITMAWA"),
        allowNull: false,
        defaultValue: "DITMAWA",
      },
      contact_person_name: {
        type: DataTypes.STRING(191),
        allowNull: false,
      },
      contact_person_email: {
        type: DataTypes.STRING(191),
        allowNull: false,
      },
      contact_person_phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      gpa_minimum: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
      },
      semester_minimum: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      scholarship_value: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      duration_semesters: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      website_url: {
        type: DataTypes.STRING(191),
        allowNull: true,
      },
      logo_path: {
        type: DataTypes.STRING(191),
        allowNull: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Scholarship",
      tableName: "scholarships",
      timestamps: true,
    }
  );
  return Scholarship;
};
