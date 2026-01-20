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
        comment: "Nama template untuk admin (tidak ditampilkan ke mahasiswa)",
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
        comment: "Jenis template: untuk rejection, revision, atau umum",
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
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        comment: "Superadmin yang membuat template",
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
        name: "comment_templates_idx_type",
      }
    );

    await queryInterface.addIndex(
      "application_comment_templates",
      ["is_active"],
      {
        name: "comment_templates_idx_active",
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("application_comment_templates");
  },
};
