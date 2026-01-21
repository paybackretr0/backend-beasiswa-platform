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
        comment: "Kunci utama untuk tembak ke API DTI",
      },
      student_name: {
        type: Sequelize.STRING(191),
        allowNull: false,
      },
      student_batch: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      study_program: {
        type: Sequelize.STRING(191),
        allowNull: true,
      },
      semester: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      fiscal_year: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      period: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      ipk: {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0.0,
        comment: "Nilai IPK hasil tarikan dari API",
      },
      academic_status: {
        type: Sequelize.ENUM("NORMAL", "WARNING", "REVOKED"),
        allowNull: true,
        defaultValue: "NORMAL",
        comment: "Otomatis berubah jadi WARNING jika IPK < 2.75",
      },
      last_synced_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Waktu terakhir sukses sync dengan API DTI",
      },
      assistance_scheme: {
        type: Sequelize.STRING(191),
        allowNull: true,
      },
      imported_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },
      imported_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("government_scholarships", ["nim"]);
    await queryInterface.addIndex("government_scholarships", [
      "academic_status",
    ]);
    await queryInterface.addIndex("government_scholarships", [
      "fiscal_year",
      "period",
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("government_scholarships");
  },
};
