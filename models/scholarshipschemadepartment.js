"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ScholarshipSchemaDepartment extends Model {
    static associate(models) {
      ScholarshipSchemaDepartment.belongsTo(models.ScholarshipSchema, {
        foreignKey: "schema_id",
        as: "schema",
      });
      ScholarshipSchemaDepartment.belongsTo(models.Department, {
        foreignKey: "department_id",
        as: "department",
      });
    }
  }

  ScholarshipSchemaDepartment.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      schema_id: {
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
      modelName: "ScholarshipSchemaDepartment",
      tableName: "scholarship_schema_departments",
      timestamps: true,
    },
  );

  return ScholarshipSchemaDepartment;
};
