"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class GovernmentScholarship extends Model {
    static associate(models) {
      GovernmentScholarship.belongsTo(models.User, {
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
        comment:
          "Angkatan (misal: 2023), diisi manual atau auto-parse dari NIM",
      },
      study_program: {
        type: DataTypes.STRING(191),
        allowNull: true,
      },
      semester: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Semester mahasiswa saat ini (misal: 4)",
      },
      fiscal_year: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Tahun periode laporan (misal: 2025)",
      },
      period: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: "Periode semester (misal: 'Genap' atau 'Ganjil')",
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
        comment: "Status hasil evaluasi IPK (WARNING jika < 2.75)",
      },
      last_synced_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Waktu terakhir data disinkronkan dengan API DTI",
      },
      assistance_scheme: {
        type: DataTypes.STRING(191),
        allowNull: true,
      },
      imported_by: {
        type: DataTypes.UUID,
        allowNull: true,
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
          unique: false,
          fields: ["nim"],
        },
        {
          unique: false,
          fields: ["academic_status"],
        },
        {
          unique: false,
          fields: ["fiscal_year", "period"],
        },
      ],
    },
  );

  return GovernmentScholarship;
};
