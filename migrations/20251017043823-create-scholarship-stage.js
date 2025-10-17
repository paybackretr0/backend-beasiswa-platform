"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("scholarship_stages", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      scholarship_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "scholarships",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      stage_name: {
        type: Sequelize.STRING(191),
        allowNull: false,
      },
      order_no: {
        type: Sequelize.INTEGER,
        allowNull: false,
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

    await queryInterface.addIndex("scholarship_stages", ["scholarship_id"], {
      name: "scholarship_stages_index_1",
    });
    await queryInterface.addIndex("scholarship_stages", ["order_no"], {
      name: "scholarship_stages_index_2",
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("scholarship_stages");
  },
};
