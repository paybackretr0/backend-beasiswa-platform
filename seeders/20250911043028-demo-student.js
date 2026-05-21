"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "students",
      [
        {
          id: "66666666-6666-6666-6666-666666666666",
          birth_date: new Date("2000-01-01"),
          birth_place: "Padang",
          nim: "2211523030",
          study_program_id: "22222222-2222-2222-2222-222222222222",
          gender: "L",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("students", null, {});
  },
};
