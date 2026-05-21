"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Faculty extends Model {
    static associate(models) {
      Faculty.hasMany(models.Department, {
        foreignKey: "faculty_id",
        as: "departments",
      });

      Faculty.hasMany(models.Staff, {
        foreignKey: "faculty_id",
        as: "staffs",
      });
    }
  }

  Faculty.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(191),
        allowNull: false,
        unique: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "Faculty",
      tableName: "faculties",
      timestamps: true,
    },
  );

  return Faculty;
};
