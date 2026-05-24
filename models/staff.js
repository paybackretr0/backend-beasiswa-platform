"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Staff extends Model {
    static associate(models) {
      Staff.belongsTo(models.User, {
        foreignKey: "id",
        as: "user",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      Staff.belongsTo(models.Faculty, {
        foreignKey: "faculty_id",
        as: "faculty",
      });

      Staff.hasMany(models.Application, {
        foreignKey: "verified_by",
        as: "verified_applications",
      });

      Staff.hasMany(models.Application, {
        foreignKey: "validated_by",
        as: "validated_applications",
      });

      Staff.hasMany(models.Application, {
        foreignKey: "rejected_by",
        as: "rejected_applications",
      });

      Staff.hasMany(models.Application, {
        foreignKey: "revision_requested_by",
        as: "revision_requested_applications",
      });

      Staff.hasMany(models.ApplicationComment, {
        foreignKey: "commented_by",
        as: "application_comments",
      });

      Staff.hasMany(models.ApplicationCommentTemplate, {
        foreignKey: "created_by",
        as: "comment_templates",
      });

      Staff.hasMany(models.Scholarship, {
        foreignKey: "created_by",
        as: "created_scholarships",
      });

      Staff.hasMany(models.Information, {
        foreignKey: "author_id",
        as: "informations",
      });

      Staff.hasMany(models.BackupHistory, {
        foreignKey: "executed_by",
        as: "backup_histories",
      });

      Staff.hasMany(models.GovernmentScholarship, {
        foreignKey: "imported_by",
        as: "imported_government_scholarships",
      });
    }
  }

  Staff.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      staff_number: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      gender: {
        type: DataTypes.ENUM("L", "P"),
        allowNull: true,
      },
      faculty_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "faculties",
          key: "id",
        },
      },
    },
    {
      sequelize,
      modelName: "Staff",
      tableName: "staffs",
      timestamps: true,
    },
  );

  return Staff;
};
