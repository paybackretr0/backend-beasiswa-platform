"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ScholarshipSchemaDocument extends Model {
    static associate(models) {
      ScholarshipSchemaDocument.belongsTo(models.ScholarshipSchema, {
        foreignKey: "schema_id",
        as: "schema",
      });
    }
  }
  ScholarshipSchemaDocument.init(
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
      document_name: {
        type: DataTypes.STRING(191),
        allowNull: false,
      },
      template_file: {
        type: DataTypes.STRING(512),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ScholarshipSchemaDocument",
      tableName: "scholarship_schema_documents",
      timestamps: true,
    }
  );
  return ScholarshipSchemaDocument;
};
