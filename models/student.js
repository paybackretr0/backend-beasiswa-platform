"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Student extends Model {
    static associate(models) {
      Student.belongsTo(models.User, {
        foreignKey: "id",
        as: "user",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      Student.belongsTo(models.StudyProgram, {
        foreignKey: "study_program_id",
        as: "study_program",
      });

      Student.hasMany(models.Application, {
        foreignKey: "student_id",
        as: "applications",
      });
    }
  }

  Student.init(
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
      nim: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      birth_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      birth_place: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      gender: {
        type: DataTypes.ENUM("L", "P"),
        allowNull: true,
      },
      study_program_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "study_programs",
          key: "id",
        },
      },
    },
    {
      sequelize,
      modelName: "Student",
      tableName: "students",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["id", "study_program_id"],
          name: "students_index_1",
        },
      ],
    },
  );

  return Student;
};
