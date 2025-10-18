"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ScholarshipStage extends Model {
    static associate(models) {
      ScholarshipStage.belongsTo(models.Scholarship, {
        foreignKey: "scholarship_id",
        as: "scholarship",
      });
      ScholarshipStage.hasMany(models.ApplicationStageProgress, {
        foreignKey: "stage_id",
        as: "progress",
      });
    }
  }

  ScholarshipStage.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      scholarship_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      stage_name: {
        type: DataTypes.STRING(191),
        allowNull: false,
      },
      order_no: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "ScholarshipStage",
      tableName: "scholarship_stages",
      timestamps: true,
    }
  );

  return ScholarshipStage;
};
