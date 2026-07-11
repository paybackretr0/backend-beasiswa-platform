"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("form_answers", "original_filename", {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: "Nama file asli sebelum diupload",
      after: "mime_type",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("form_answers", "original_filename");
  },
};
