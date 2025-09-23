"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class GovernmentScholarship extends Model {
    static associate(models) {
      // GovernmentScholarship diimport oleh User (Superadmin)
      GovernmentScholarship.belongsTo(models.User, {
        foreignKey: "imported_by",
        as: "importer",
      });
    }
  }
  GovernmentScholarship.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      nim: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      student_name: {
        type: DataTypes.STRING(191),
        allowNull: false,
      },
      semester: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      study_program: {
        type: DataTypes.STRING(191),
        allowNull: true,
      },
      assistance_scheme: {
        type: DataTypes.STRING(191),
        allowNull: true,
      },
      living_expenses: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },
      tuition_fee: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },
      scholarship_category: {
        type: DataTypes.STRING(191),
        allowNull: true,
        comment: "e.g., KIP Kuliah",
      },
      acceptance_year: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      acceptance_period: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      imported_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      imported_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "GovernmentScholarship",
      tableName: "government_scholarships",
      timestamps: false,
    }
  );
  return GovernmentScholarship;
};
