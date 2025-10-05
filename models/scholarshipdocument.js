"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ScholarshipDocument extends Model {
    static associate(models) {
      ScholarshipDocument.belongsTo(models.Scholarship, {
        foreignKey: "scholarship_id",
        as: "scholarship",
      });
    }
  }

  ScholarshipDocument.init(
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
      document_name: {
        type: DataTypes.STRING(191),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "ScholarshipDocument",
      tableName: "scholarship_documents",
      timestamps: true,
    }
  );

  return ScholarshipDocument;
};
