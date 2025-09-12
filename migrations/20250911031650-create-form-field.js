"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("form_fields", {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      scholarship_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: "scholarships",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      label: {
        type: Sequelize.STRING(191),
        allowNull: false,
        comment: "Judul pertanyaan / nama input",
      },
      type: {
        type: Sequelize.ENUM(
          "TEXT",
          "NUMBER",
          "DATE",
          "FILE",
          "SELECT",
          "TEXTAREA"
        ),
        allowNull: false,
        defaultValue: "TEXT",
      },
      is_required: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      options_json: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Pilihan untuk SELECT/opsi lain",
      },
      order_no: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Urutan field di form",
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

    await queryInterface.addIndex("form_fields", ["scholarship_id"], {
      name: "form_fields_idx_scholarship",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("form_fields");
  },
};
