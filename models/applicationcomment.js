"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ApplicationComment extends Model {
    static associate(models) {
      ApplicationComment.belongsTo(models.Application, {
        foreignKey: "application_id",
        as: "application",
      });

      ApplicationComment.belongsTo(models.ApplicationCommentTemplate, {
        foreignKey: "template_id",
        as: "template",
      });

      ApplicationComment.belongsTo(models.Staff, {
        foreignKey: "commented_by",
        as: "commenter",
      });
    }
  }

  ApplicationComment.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      application_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "applications",
          key: "id",
        },
      },
      comment_text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      comment_type: {
        type: DataTypes.ENUM(
          "REJECTION",
          "REVISION",
          "VERIFICATION",
          "VALIDATION",
          "GENERAL",
        ),
        allowNull: false,
        defaultValue: "GENERAL",
      },
      template_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "application_comment_templates",
          key: "id",
        },
      },
      commented_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "staffs",
          key: "id",
        },
      },
      is_visible_to_student: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "ApplicationComment",
      tableName: "application_comments",
      timestamps: true,
    },
  );

  return ApplicationComment;
};
