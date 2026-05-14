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

      Scholarship.hasMany(models.ScholarshipBenefit, {
        foreignKey: "scholarship_id",
        as: "benefits",
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
    },
  );
  return Scholarship;
};
