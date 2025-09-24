"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Scholarship extends Model {
    static associate(models) {
      // Scholarship dibuat oleh User
      Scholarship.belongsTo(models.User, { foreignKey: "created_by" });
      Scholarship.hasMany(models.Application, { foreignKey: "scholarship_id" });
      Scholarship.hasMany(models.FormField, { foreignKey: "scholarship_id" });
    }
  }
  Scholarship.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING(191),
        allowNull: false,
      },
      organizer: {
        type: DataTypes.STRING(191),
        allowNull: true,
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quota: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      requirements_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
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
      modelName: "Scholarship",
      tableName: "scholarships",
      timestamps: true, // createdAt & updatedAt otomatis
    }
  );
  return Scholarship;
};
