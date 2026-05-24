"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("scholarship_schema_study_programs", {
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
      study_program_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "study_programs",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex(
      "scholarship_schema_study_programs",
      ["schema_id", "study_program_id"],
      {
        unique: true,
        name: "uq_schema_study_program",
      },
    );

    await queryInterface.addIndex(
      "scholarship_schema_study_programs",
      ["id", "schema_id"],
      {
        unique: true,
        name: "uq_schema_study_program_id_schema",
      },
    );

    await queryInterface.addIndex(
      "scholarship_schema_study_programs",
      ["id", "study_program_id"],
      {
        unique: true,
        name: "uq_schema_study_program_id_study_program",
      },
    );

    await queryInterface.addIndex(
      "scholarship_schema_study_programs",
      ["study_program_id"],
      {
        name: "idx_schema_study_programs_study_program_id",
      },
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("scholarship_schema_study_programs");
  },
};
