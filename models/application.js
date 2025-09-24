"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Application extends Model {
    static associate(models) {
      // Application belongs to Scholarship
      Application.belongsTo(models.Scholarship, {
        foreignKey: "scholarship_id",
      });
      // Application belongs to User (student)
      Application.belongsTo(models.User, {
        foreignKey: "student_id",
        as: "student",
      });
      // Application can be verified by User (verifikator)
      Application.belongsTo(models.User, {
        foreignKey: "verified_by",
        as: "verificator",
      });
      // Application has many ApplicationDocument
      Application.hasMany(models.ApplicationDocument, {
        foreignKey: "application_id",
      });
      Application.hasMany(models.FormAnswer, { foreignKey: "application_id" });
    }
  }
  Application.init(
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
      student_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          "DRAFT",
          "SUBMITTED",
          "VERIFIED",
          "REJECTED",
          "ACCEPTED",
          "WAITLIST"
        ),
        allowNull: false,
        defaultValue: "DRAFT",
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      verified_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      score_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Application",
      tableName: "applications",
      timestamps: true, // createdAt & updatedAt otomatis
    }
  );
  return Application;
};
