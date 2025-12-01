"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "study_programs",
      [
        {
          id: "11111111-1111-1111-1111-111111111111",
          department_id: "11111111-1111-1111-1111-111111111111",
          code: "1",
          degree: "S1",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "22222222-2222-2222-2222-222222222222",
          department_id: "22222222-2222-2222-2222-222222222222",
          code: "2",
          degree: "S1",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "33333333-3333-3333-3333-333333333333",
          department_id: "33333333-3333-3333-3333-333333333333",
          code: "3",
          degree: "S1",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("study_programs", null, {});
  },
};
