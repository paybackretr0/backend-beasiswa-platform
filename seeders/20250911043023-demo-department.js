"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "departments",
      [
        {
          id: 1,
          faculty_id: 15,
          code: "1",
          name: "Teknik Komputer",
          degree: "S1",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          faculty_id: 15,
          code: "2",
          name: "Sistem Informasi",
          degree: "S1",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 3,
          faculty_id: 15,
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
