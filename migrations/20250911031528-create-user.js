"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("users", {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
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
      role: {
        type: Sequelize.ENUM(
          "MAHASISWA",
          "VERIFIKATOR",
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
      department_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: "departments",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      gender: {
        type: Sequelize.ENUM("L", "P"),
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
