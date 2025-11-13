"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class FormField extends Model {
    static associate(models) {
      FormField.belongsTo(models.Scholarship, { foreignKey: "scholarship_id" });
      FormField.hasMany(models.FormAnswer, { foreignKey: "field_id" });
    }
  }
  FormField.init(
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
      label: {
        type: DataTypes.STRING(191),
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM(
          "TEXT",
          "NUMBER",
          "DATE",
          "FILE",
          "SELECT",
          "TEXTAREA"
        ),
        allowNull: false,
        defaultValue: "TEXT",
      },
      is_required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      options_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      order_no: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "FormField",
      tableName: "form_fields",
      timestamps: true,
    }
  );
  return FormField;
};
