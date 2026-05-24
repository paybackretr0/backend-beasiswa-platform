"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("form_answer_options", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      answer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "form_answers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      option_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "form_field_options",
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

    await queryInterface.addIndex("form_answer_options", ["answer_id"], {
      name: "idx_form_answer_options_answer_id",
    });

    await queryInterface.addIndex("form_answer_options", ["option_id"], {
      name: "idx_form_answer_options_option_id",
    });

    await queryInterface.addIndex(
      "form_answer_options",
      ["answer_id", "option_id"],
      {
        unique: true,
        name: "uq_form_answer_options_answer_option",
      },
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("form_answer_options");
  },
};
