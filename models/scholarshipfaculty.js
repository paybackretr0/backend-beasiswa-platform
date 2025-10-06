"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ScholarshipFaculty extends Model {
    static associate(models) {
      ScholarshipFaculty.belongsTo(models.Scholarship, {
        foreignKey: "scholarship_id",
        as: "scholarship",
      });
      ScholarshipFaculty.belongsTo(models.Faculty, {
        foreignKey: "faculty_id",
        as: "faculty",
      });
    }
  }

  ScholarshipFaculty.init(
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
      faculty_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "ScholarshipFaculty",
      tableName: "scholarship_faculties",
      timestamps: true,
    }
  );

  return ScholarshipFaculty;
};
