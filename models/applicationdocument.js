"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ApplicationDocument extends Model {
    static associate(models) {
      ApplicationDocument.belongsTo(models.Application, {
        foreignKey: "application_id",
        as: "application",
      });
      ApplicationDocument.belongsTo(models.ScholarshipSchemaDocument, {
        foreignKey: "schema_document_id",
        as: "schemaDocument",
      });
    }
  }
  ApplicationDocument.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      application_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      schema_document_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      file_path: {
        type: DataTypes.STRING(512),
        allowNull: false,
      },
      mime_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      size_bytes: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ApplicationDocument",
      tableName: "application_documents",
      timestamps: true,
      updatedAt: false,
    },
  );
  return ApplicationDocument;
};
