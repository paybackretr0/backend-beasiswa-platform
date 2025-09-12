"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("backup_histories", {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      executed_by: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      storage_target: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      file_path: {
        type: Sequelize.STRING(512),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("SUCCESS", "FAILED"),
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("backup_histories", ["status"], {
      name: "backup_histories_index_11",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("backup_histories");
  },
};
