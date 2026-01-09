"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("scholarship_schema_requirements", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      schema_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "scholarship_schemas",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      requirement_type: {
        type: Sequelize.ENUM("FILE", "TEXT"),
        allowNull: false,
        defaultValue: "TEXT",
      },
      requirement_text: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      requirement_file: {
        type: Sequelize.STRING(512),
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

    await queryInterface.addIndex(
      "scholarship_schema_requirements",
      ["schema_id"],
      {
        name: "schema_requirements_idx_schema",
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("scholarship_schema_requirements");
  },
};
