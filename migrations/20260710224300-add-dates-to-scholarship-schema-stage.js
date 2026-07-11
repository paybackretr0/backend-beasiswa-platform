"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("scholarship_schema_stages", "start_date", {
      type: Sequelize.DATE,
      allowNull: true,
      comment: "Tanggal mulai tahapan seleksi",
      after: "order_no",
    });

    await queryInterface.addColumn("scholarship_schema_stages", "end_date", {
      type: Sequelize.DATE,
      allowNull: true,
      comment: "Tanggal akhir tahapan seleksi",
      after: "start_date",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(
      "scholarship_schema_stages",
      "start_date",
    );
    await queryInterface.removeColumn("scholarship_schema_stages", "end_date");
  },
};
