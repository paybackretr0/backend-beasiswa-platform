"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Scholarship extends Model {
    static associate(models) {
      // Scholarship dibuat oleh User
      Scholarship.belongsTo(models.User, { foreignKey: "created_by" });
      Scholarship.hasMany(models.Application, { foreignKey: "scholarship_id" });
      Scholarship.hasMany(models.FormField, { foreignKey: "scholarship_id" });

      // Relasi dengan tabel junction
      Scholarship.hasMany(models.ScholarshipFaculty, {
        foreignKey: "scholarship_id",
        as: "scholarshipFaculties",
      });
      Scholarship.hasMany(models.ScholarshipDepartment, {
        foreignKey: "scholarship_id",
        as: "scholarshipDepartments",
      });
      Scholarship.hasMany(models.ScholarshipDocument, {
        foreignKey: "scholarship_id",
        as: "scholarshipDocuments",
      });
      Scholarship.hasMany(models.ScholarshipRequirement, {
        foreignKey: "scholarship_id",
        as: "requirements",
      });
      Scholarship.hasMany(models.ScholarshipBenefit, {
        foreignKey: "scholarship_id",
        as: "benefits",
      });

      // Many-to-many relations through junction tables
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
      scholarship_status: {
        type: DataTypes.ENUM("AKTIF", "NONAKTIF"),
        allowNull: false,
        defaultValue: "AKTIF",
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
      timestamps: true, // createdAt & updatedAt otomatis
    }
  );
  return Scholarship;
};
