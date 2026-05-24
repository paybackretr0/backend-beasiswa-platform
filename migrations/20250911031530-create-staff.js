"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("staffs", {
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
      staff_number: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      gender: {
        type: Sequelize.ENUM("L", "P"),
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

    await queryInterface.addIndex("staffs", ["faculty_id"], {
      name: "idx_staffs_faculty_id",
    });

    await queryInterface.addIndex("staffs", ["staff_number"], {
      name: "idx_staffs_staff_number",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("staffs");
  },
};
