"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class FormFieldOption extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      FormFieldOption.belongsTo(models.FormField, {
        foreignKey: "field_id",
        as: "field",
      });
    }
  }
  FormFieldOption.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      field_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      value: {
        type: DataTypes.STRING(255),
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
      modelName: "FormFieldOption",
      tableName: "form_field_options",
      timestamps: true,
    },
  );
  return FormFieldOption;
};
