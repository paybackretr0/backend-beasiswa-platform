"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("users", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(191),
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      full_name: {
        type: Sequelize.STRING(191),
        allowNull: false,
      },
      birth_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      birth_place: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      role: {
        type: Sequelize.ENUM(
          "MAHASISWA",
          "VERIFIKATOR_FAKULTAS",
          "VERIFIKATOR_DITMAWA",
          "VALIDATOR_DITMAWA",
          "PIMPINAN_DITMAWA",
          "PIMPINAN_FAKULTAS",
          "SUPERADMIN"
        ),
        allowNull: false,
        defaultValue: "MAHASISWA",
      },
      nim: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      faculty_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "faculties",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      department_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "departments",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      study_program_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "study_programs",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      gender: {
        type: Sequelize.ENUM("L", "P"),
        allowNull: true,
      },
      phone_number: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      last_login_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      emailVerificationCode: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      emailVerified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      resetPasswordCode: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      resetPasswordExpires: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.addIndex("users", ["role"], { name: "users_index_0" });
    await queryInterface.addIndex("users", ["department_id"], {
      name: "users_index_2",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("users");
  },
};
