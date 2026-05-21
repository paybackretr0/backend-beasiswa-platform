"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("application_comment_templates", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      template_name: {
        type: Sequelize.STRING(191),
        allowNull: false,
        comment: "Nama template untuk admin/staf",
      },
      comment_text: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: "Isi komentar yang akan digunakan",
      },
      template_type: {
        type: Sequelize.ENUM("REJECTION", "REVISION", "GENERAL"),
        allowNull: false,
        defaultValue: "GENERAL",
        comment: "Jenis template: rejection, revision, atau umum",
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "staffs",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        comment: "Staf yang membuat template",
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
      "application_comment_templates",
      ["template_type"],
      {
        name: "idx_comment_templates_type",
      },
    );

    await queryInterface.addIndex(
      "application_comment_templates",
      ["is_active"],
      {
        name: "idx_comment_templates_is_active",
      },
    );

    await queryInterface.addIndex(
      "application_comment_templates",
      ["created_by"],
      {
        name: "idx_comment_templates_created_by",
      },
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("application_comment_templates");
  },
};
