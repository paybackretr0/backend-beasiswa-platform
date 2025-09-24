"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class FormAnswer extends Model {
    static associate(models) {
      // FormAnswer belongs to Application
      FormAnswer.belongsTo(models.Application, {
        foreignKey: "application_id",
      });
      // FormAnswer belongs to FormField
      FormAnswer.belongsTo(models.FormField, { foreignKey: "field_id" });
    }
  }
  FormAnswer.init(
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
      field_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      answer_text: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Isi jawaban untuk TEXT, NUMBER, DATE, SELECT, TEXTAREA",
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
      timestamps: true, // createdAt & updatedAt otomatis
    }
  );
  return FormAnswer;
};
