"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "staffs",
      [
        {
          id: "00000000-0000-0000-0000-000000000000",
          faculty_id: null,
          gender: "L",
          staff_number: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "11111111-1111-1111-1111-111111111111",
          faculty_id: null,
          gender: "L",
          staff_number: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "22222222-2222-2222-2222-222222222222",
          faculty_id: "99999999-9999-9999-9999-999999999999",
          gender: "L",
          staff_number: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "33333333-3333-3333-3333-333333333333",
          faculty_id: "15151515-1515-1515-1515-151515151515",
          gender: "P",
          staff_number: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "44444444-4444-4444-4444-444444444444",
          faculty_id: null,
          gender: "P",
          staff_number: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "77777777-7777-7777-7777-777777777777",
          faculty_id: null,
          gender: "P",
          staff_number: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "55555555-5555-5555-5555-555555555555",
          faculty_id: "15151515-1515-1515-1515-151515151515",
          gender: "L",
          staff_number: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("staffs", null, {});
  },
};
