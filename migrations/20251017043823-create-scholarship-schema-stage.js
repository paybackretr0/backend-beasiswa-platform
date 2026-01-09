"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("scholarship_schema_stages", {
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
      stage_name: {
        type: Sequelize.STRING(191),
        allowNull: false,
        comment: "Nama tahapan seleksi",
      },
      order_no: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Urutan tahapan dalam skema",
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

    await queryInterface.addIndex("scholarship_schema_stages", ["schema_id"], {
      name: "schema_stages_idx_schema",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("scholarship_schema_stages");
  },
};
