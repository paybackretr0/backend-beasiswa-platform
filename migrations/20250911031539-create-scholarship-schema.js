"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("scholarship_schemas", {
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
      name: {
        type: Sequelize.STRING(191),
        allowNull: false,
        comment:
          "Nama skema beasiswa (e.g., Beasiswa Berkelanjutan, Prestasi Akademik S1/S2/S3)",
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Deskripsi skema beasiswa",
      },
      quota: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "Kuota per skema (opsional)",
      },
      gpa_minimum: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
        comment:
          "IPK minimum untuk skema ini (override dari parent scholarship)",
      },
      semester_minimum: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "Semester minimum untuk skema ini",
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.addIndex("scholarship_schemas", ["scholarship_id"], {
      name: "scholarship_schemas_idx_scholarship",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("scholarship_schemas");
  },
};
