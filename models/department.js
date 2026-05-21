"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Department extends Model {
    static associate(models) {
      Department.belongsTo(models.Faculty, {
        foreignKey: "faculty_id",
        as: "faculty",
      });

      Department.hasMany(models.StudyProgram, {
        foreignKey: "department_id",
        as: "study_programs",
      });
    }
  }

  Department.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
      },
      faculty_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "faculties",
          key: "id",
        },
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(191),
        allowNull: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "Department",
      tableName: "departments",
      timestamps: true,
    },
  );

  return Department;
};
