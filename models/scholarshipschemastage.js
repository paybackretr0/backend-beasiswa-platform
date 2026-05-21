"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ScholarshipSchemaStage extends Model {
    static associate(models) {
      ScholarshipSchemaStage.belongsTo(models.ScholarshipSchema, {
        foreignKey: "schema_id",
        as: "schema",
      });

      ScholarshipSchemaStage.hasMany(models.ApplicationStageProgress, {
        foreignKey: "stage_id",
        as: "stage_progress",
      });
    }
  }

  ScholarshipSchemaStage.init(
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
        references: {
          model: "scholarship_schemas",
          key: "id",
        },
      },
      stage_name: {
        type: DataTypes.STRING(191),
        allowNull: false,
      },
      order_no: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "ScholarshipSchemaStage",
      tableName: "scholarship_schema_stages",
      timestamps: true,
    },
  );

  return ScholarshipSchemaStage;
};
