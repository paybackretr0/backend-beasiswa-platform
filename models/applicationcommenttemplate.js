"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ApplicationCommentTemplate extends Model {
    static associate(models) {
      ApplicationCommentTemplate.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
    }
  }
  ApplicationCommentTemplate.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      template_name: {
        type: DataTypes.STRING(191),
        allowNull: false,
      },
      comment_text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      template_type: {
        type: DataTypes.ENUM("REJECTION", "REVISION", "GENERAL"),
        allowNull: false,
        defaultValue: "GENERAL",
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ApplicationCommentTemplate",
      tableName: "application_comment_templates",
      timestamps: true,
    }
  );
  return ApplicationCommentTemplate;
};
