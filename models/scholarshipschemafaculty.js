"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ScholarshipSchemaFaculty extends Model {
    static associate(models) {
      ScholarshipSchemaFaculty.belongsTo(models.ScholarshipSchema, {
        foreignKey: "schema_id",
        as: "schema",
      });
      ScholarshipSchemaFaculty.belongsTo(models.Faculty, {
        foreignKey: "faculty_id",
        as: "faculty",
      });
    }
  }

  ScholarshipSchemaFaculty.init(
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
      faculty_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "ScholarshipSchemaFaculty",
      tableName: "scholarship_schema_faculties",
      timestamps: true,
    },
  );

  return ScholarshipSchemaFaculty;
};
