"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ScholarshipBenefit extends Model {
    static associate(models) {
      ScholarshipBenefit.belongsTo(models.Scholarship, {
        foreignKey: "scholarship_id",
        as: "scholarship",
      });
    }
  }

  ScholarshipBenefit.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
      },
      scholarship_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "scholarships",
          key: "id",
        },
      },
      benefit_text: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ScholarshipBenefit",
      tableName: "scholarship_benefits",
      timestamps: true,
    },
  );

  return ScholarshipBenefit;
};
