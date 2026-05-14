"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("application_documents", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      application_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "applications",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      schema_document_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "scholarship_schema_documents",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      file_path: {
        type: Sequelize.STRING(512),
        allowNull: false,
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      size_bytes: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("application_documents", ["application_id"], {
      name: "application_documents_index_8",
    });

    await queryInterface.addIndex(
      "application_documents",
      ["schema_document_id"],
      {
        name: "application_documents_idx_schema_document",
      },
    );

    await queryInterface.addIndex(
      "application_documents",
      ["application_id", "schema_document_id"],
      {
        name: "application_documents_unique_app_schema_doc",
        unique: true,
      },
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("application_documents");
  },
};
