"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("departments", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      faculty_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "faculties",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(191),
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.addIndex("departments", ["faculty_id"], {
      name: "idx_departments_faculty_id",
    });

    await queryInterface.addIndex("departments", ["faculty_id", "code"], {
      unique: true,
      name: "uq_departments_faculty_code",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("departments");
  },
};
