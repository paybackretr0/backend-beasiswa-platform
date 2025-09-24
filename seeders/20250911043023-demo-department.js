"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "departments",
      [
        {
          id: "11111111-1111-1111-1111-111111111111",
          faculty_id: "15151515-1515-1515-1515-151515151515",
          code: "1",
          name: "Teknik Komputer",
          degree: "S1",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "22222222-2222-2222-2222-222222222222",
          faculty_id: "15151515-1515-1515-1515-151515151515",
          code: "2",
          name: "Sistem Informasi",
          degree: "S1",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "33333333-3333-3333-3333-333333333333",
          faculty_id: "15151515-1515-1515-1515-151515151515",
          code: "3",
          name: "Informatika",
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
    await queryInterface.bulkDelete("departments", null, {});
  },
};
