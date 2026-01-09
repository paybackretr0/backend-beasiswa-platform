"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("scholarship_schema_documents", {
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
      document_name: {
        type: Sequelize.STRING(191),
        allowNull: false,
        comment: "Nama dokumen yang harus dilampirkan",
      },
      template_file: {
        type: Sequelize.STRING(512),
        allowNull: true,
        comment: "Path file template dokumen (jika ada)",
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
      "scholarship_schema_documents",
      ["schema_id"],
      {
        name: "schema_documents_idx_schema",
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("scholarship_schema_documents");
  },
};
