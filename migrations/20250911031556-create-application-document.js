"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("application_documents", {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      application_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: "applications",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      document_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
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
      is_valid: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      checked_by: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      checked_at: {
        type: Sequelize.DATE,
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("application_documents");
  },
};
