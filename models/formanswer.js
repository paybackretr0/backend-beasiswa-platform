"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class FormAnswer extends Model {
    static associate(models) {
      FormAnswer.belongsTo(models.Application, {
        foreignKey: "application_id",
        as: "application",
      });

      FormAnswer.belongsTo(models.FormField, {
        foreignKey: "field_id",
        as: "field",
      });

      FormAnswer.hasMany(models.FormAnswerOption, {
        foreignKey: "answer_id",
        as: "selected_options",
      });
    }
  }

  FormAnswer.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
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
      field_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "form_fields",
          key: "id",
        },
      },
      answer_text: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Isi jawaban untuk TEXT, NUMBER, DATE, TEXTAREA",
      },
      file_path: {
        type: DataTypes.STRING(512),
        allowNull: true,
        comment: "Lokasi file bila type=FILE",
      },
      mime_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      uploaded_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "FormAnswer",
      tableName: "form_answers",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["application_id", "field_id"],
          name: "uq_form_answers_application_field",
        },
      ],
    },
  );

  return FormAnswer;
};
