"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("scholarships", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(191),
        allowNull: false,
      },
      organizer: {
        type: Sequelize.STRING(191),
        allowNull: true,
      },
      year: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      quota: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      is_external: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Apakah beasiswa eksternal (tidak dikelola UNAND)",
      },
      verification_level: {
        type: Sequelize.ENUM("FACULTY", "DITMAWA"),
        allowNull: false,
        defaultValue: "DITMAWA",
      },
      contact_person_name: {
        type: Sequelize.STRING(191),
        allowNull: false,
      },
      contact_person_email: {
        type: Sequelize.STRING(191),
        allowNull: false,
      },
      contact_person_phone: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      gpa_minimum: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
      },
      semester_minimum: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      scholarship_value: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      duration_semesters: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      website_url: {
        type: Sequelize.STRING(191),
        allowNull: true,
      },
      logo_path: {
        type: Sequelize.STRING(191),
        allowNull: true,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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

    await queryInterface.addIndex("scholarships", ["year"], {
      name: "scholarships_index_4",
    });
    await queryInterface.addIndex("scholarships", ["is_active"], {
      name: "scholarships_index_5",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("scholarships");
  },
};
