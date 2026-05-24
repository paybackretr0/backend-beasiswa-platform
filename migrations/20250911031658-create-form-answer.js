"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("form_answers", {
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
      field_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "form_fields",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      answer_text: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Isi jawaban untuk TEXT, NUMBER, DATE, TEXTAREA",
      },
      file_path: {
        type: Sequelize.STRING(512),
        allowNull: true,
        comment: "Lokasi file bila type=FILE",
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      uploaded_at: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex("form_answers", ["application_id"], {
      name: "idx_form_answers_application_id",
    });

    await queryInterface.addIndex("form_answers", ["field_id"], {
      name: "idx_form_answers_field_id",
    });

    await queryInterface.addIndex(
      "form_answers",
      ["application_id", "field_id"],
      {
        unique: true,
        name: "uq_form_answers_application_field",
      },
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("form_answers");
  },
};
