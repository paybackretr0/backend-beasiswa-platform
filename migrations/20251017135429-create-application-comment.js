"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("application_comments", {
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
      comment_text: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: "Isi komentar dari staf pengelola",
      },
      comment_type: {
        type: Sequelize.ENUM(
          "REJECTION",
          "REVISION",
          "VERIFICATION",
          "VALIDATION",
          "GENERAL",
        ),
        allowNull: false,
        defaultValue: "GENERAL",
        comment: "Tipe komentar sesuai status aplikasi",
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "application_comment_templates",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        comment: "Template yang digunakan jika menggunakan template",
      },
      commented_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "staffs",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
        comment: "Staf yang memberikan komentar",
      },
      is_visible_to_student: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "Apakah komentar ditampilkan ke mahasiswa",
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

    await queryInterface.addIndex("application_comments", ["application_id"], {
      name: "idx_application_comments_application_id",
    });

    await queryInterface.addIndex("application_comments", ["comment_type"], {
      name: "idx_application_comments_comment_type",
    });

    await queryInterface.addIndex("application_comments", ["commented_by"], {
      name: "idx_application_comments_commented_by",
    });

    await queryInterface.addIndex("application_comments", ["template_id"], {
      name: "idx_application_comments_template_id",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("application_comments");
  },
};
