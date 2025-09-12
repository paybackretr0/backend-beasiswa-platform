"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Department extends Model {
    static associate(models) {
      // Department belongs to Faculty
      Department.belongsTo(models.Faculty, { foreignKey: "faculty_id" });
      Department.hasMany(models.User, { foreignKey: "department_id" });
    }
  }
  Department.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      faculty_id: {
        type: DataTypes.BIGINT,
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
      },
      degree: {
        type: DataTypes.ENUM("D3", "D4", "S1", "S2", "S3"),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "Department",
      tableName: "departments",
      timestamps: true, // createdAt & updatedAt otomatis
    }
  );
  return Department;
};
