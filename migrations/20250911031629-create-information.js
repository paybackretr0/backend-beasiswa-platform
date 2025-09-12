"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("informations", {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM("NEWS", "ARTICLE"),
        allowNull: false,
        defaultValue: "NEWS",
      },
      title: {
        type: Sequelize.STRING(191),
        allowNull: false,
      },
      slug: {
        type: Sequelize.STRING(191),
        allowNull: false,
        unique: true,
      },
      content: {
        type: Sequelize.TEXT("long"),
        allowNull: false,
      },
      cover_url: {
        type: Sequelize.STRING(512),
        allowNull: true,
        comment: "gambar utama",
      },
      status: {
        type: Sequelize.ENUM("DRAFT", "PUBLISHED", "ARCHIVED"),
        allowNull: false,
        defaultValue: "DRAFT",
      },
      author_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      published_at: {
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
      meta: {
        type: Sequelize.JSON,
        allowNull: true,
      },
    });

    await queryInterface.addIndex("informations", ["status"], {
      name: "informations_index_12",
    });
    await queryInterface.addIndex("informations", ["published_at"], {
      name: "informations_index_13",
    });
    await queryInterface.addIndex("informations", ["author_id"], {
      name: "informations_index_14",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("informations");
  },
};
