"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("students", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      nim: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      birth_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      birth_place: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      gender: {
        type: Sequelize.ENUM("L", "P"),
        allowNull: true,
      },
      study_program_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "study_programs",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("students", ["id", "study_program_id"], {
      unique: true,
      name: "uq_students_id_study_program",
    });

    await queryInterface.addIndex("students", ["study_program_id"], {
      name: "idx_students_study_program_id",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("students");
  },
};
