"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ScholarshipSchemaRequirement extends Model {
    static associate(models) {
      ScholarshipSchemaRequirement.belongsTo(models.ScholarshipSchema, {
        foreignKey: "schema_id",
        as: "schema",
      });
    }
  }
  ScholarshipSchemaRequirement.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      schema_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      requirement_type: {
        type: DataTypes.ENUM("FILE", "TEXT"),
        allowNull: false,
        defaultValue: "TEXT",
      },
      requirement_text: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      requirement_file: {
        type: DataTypes.STRING(512),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ScholarshipSchemaRequirement",
      tableName: "scholarship_schema_requirements",
      timestamps: true,
    }
  );
  return ScholarshipSchemaRequirement;
};
