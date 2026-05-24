"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class FormAnswerOption extends Model {
    static associate(models) {
      FormAnswerOption.belongsTo(models.FormAnswer, {
        foreignKey: "answer_id",
        as: "answer",
      });

      FormAnswerOption.belongsTo(models.FormFieldOption, {
        foreignKey: "option_id",
        as: "option",
      });
    }
  }

  FormAnswerOption.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
      },
      answer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "form_answers",
          key: "id",
        },
      },
      option_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "form_field_options",
          key: "id",
        },
      },
    },
    {
      sequelize,
      modelName: "FormAnswerOption",
      tableName: "form_answer_options",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["answer_id", "option_id"],
          name: "uq_form_answer_options_answer_option",
        },
      ],
    },
  );

  return FormAnswerOption;
};
