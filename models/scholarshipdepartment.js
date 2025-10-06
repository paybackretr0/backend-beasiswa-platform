"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ScholarshipDepartment extends Model {
    static associate(models) {
      ScholarshipDepartment.belongsTo(models.Scholarship, {
        foreignKey: "scholarship_id",
        as: "scholarship",
      });
      ScholarshipDepartment.belongsTo(models.Department, {
        foreignKey: "department_id",
        as: "department",
      });
    }
  }

  ScholarshipDepartment.init(
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
      department_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "ScholarshipDepartment",
      tableName: "scholarship_departments",
      timestamps: true,
    }
  );

  return ScholarshipDepartment;
};
