"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class GovernmentScholarship extends Model {
    static associate(models) {
      GovernmentScholarship.belongsTo(models.Staff, {
        foreignKey: "imported_by",
        as: "importer",
      });
    }
  }

  GovernmentScholarship.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
      },
      nim: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      student_name: {
        type: DataTypes.STRING(191),
        allowNull: false,
      },
      student_batch: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Angkatan, misalnya 2023",
      },
      study_program: {
        type: DataTypes.STRING(191),
        allowNull: true,
      },
      semester: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      fiscal_year: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      period: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      ipk: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0.0,
      },
      academic_status: {
        type: DataTypes.ENUM("NORMAL", "WARNING", "REVOKED"),
        allowNull: true,
        defaultValue: "NORMAL",
      },
      last_synced_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      assistance_scheme: {
        type: DataTypes.STRING(191),
        allowNull: true,
      },
      imported_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "staffs",
          key: "id",
        },
      },
      imported_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "GovernmentScholarship",
      tableName: "government_scholarships",
      timestamps: false,
      indexes: [
        {
          fields: ["nim"],
        },
        {
          fields: ["academic_status"],
        },
        {
          fields: ["fiscal_year", "period"],
        },
      ],
    },
  );

  return GovernmentScholarship;
};
