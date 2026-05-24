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

      schema_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "scholarship_schemas",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
        comment: "Skema dari pendaftaran untuk menjaga integritas dokumen",
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
      name: "idx_application_documents_application_id",
    });

    await queryInterface.addIndex("application_documents", ["schema_id"], {
      name: "idx_application_documents_schema_id",
    });

    await queryInterface.addIndex(
      "application_documents",
      ["schema_document_id"],
      {
        name: "idx_application_documents_schema_document_id",
      },
    );

    await queryInterface.addIndex(
      "application_documents",
      ["application_id", "schema_document_id"],
      {
        name: "uq_application_documents_application_schema_document",
        unique: true,
      },
    );

    await queryInterface.sequelize.query(`
      ALTER TABLE application_documents
      ADD CONSTRAINT fk_appdocs_application_schema
      FOREIGN KEY (application_id, schema_id)
      REFERENCES applications(id, schema_id)
      ON UPDATE CASCADE
      ON DELETE CASCADE;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE application_documents
      ADD CONSTRAINT fk_appdocs_document_schema
      FOREIGN KEY (schema_document_id, schema_id)
      REFERENCES scholarship_schema_documents(id, schema_id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE application_documents
      DROP FOREIGN KEY fk_appdocs_document_schema;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE application_documents
      DROP FOREIGN KEY fk_appdocs_application_schema;
    `);

    await queryInterface.dropTable("application_documents");
  },
};
