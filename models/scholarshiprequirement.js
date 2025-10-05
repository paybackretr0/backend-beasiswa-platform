"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ScholarshipRequirement extends Model {
    static associate(models) {
      // Relasi dengan Scholarship
      ScholarshipRequirement.belongsTo(models.Scholarship, {
        foreignKey: "scholarship_id",
        as: "scholarship",
      });
    }
  }

  ScholarshipRequirement.init(
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
        type: DataTypes.STRING(191),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ScholarshipRequirement",
      tableName: "scholarship_requirements",
      timestamps: true,
    }
  );

  return ScholarshipRequirement;
};
