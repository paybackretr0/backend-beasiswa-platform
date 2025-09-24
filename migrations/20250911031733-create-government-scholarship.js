"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("government_scholarships", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      nim: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      student_name: {
        type: Sequelize.STRING(191),
        allowNull: false,
      },
      semester: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      study_program: {
        type: Sequelize.STRING(191),
        allowNull: true,
      },
      assistance_scheme: {
        type: Sequelize.STRING(191),
        allowNull: true,
      },
      living_expenses: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      tuition_fee: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      scholarship_category: {
        type: Sequelize.STRING(191),
        allowNull: true,
        comment: "e.g., KIP Kuliah",
      },
      acceptance_year: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      acceptance_period: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      imported_by: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: "ID Superadmin yang mengimpor data",
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      imported_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("government_scholarships", ["nim"], {
      name: "government_scholarships_idx_nim",
    });
    await queryInterface.addIndex(
      "government_scholarships",
      ["acceptance_year"],
      {
        name: "government_scholarships_idx_year",
      }
    );
    await queryInterface.addIndex(
      "government_scholarships",
      ["scholarship_category"],
      { name: "government_scholarships_idx_category" }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("government_scholarships");
  },
};
