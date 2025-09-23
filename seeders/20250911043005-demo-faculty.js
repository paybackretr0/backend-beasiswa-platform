"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "faculties",
      [
        {
          id: "11111111-1111-1111-1111-111111111111",
          code: "01",
          name: "Fakultas Hukum",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "22222222-2222-2222-2222-222222222222",
          code: "02",
          name: "Fakultas Pertanian",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "33333333-3333-3333-3333-333333333333",
          code: "03",
          name: "Fakultas Kedokteran",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "44444444-4444-4444-4444-444444444444",
          code: "04",
          name: "Fakultas MIPA",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "55555555-5555-5555-5555-555555555555",
          code: "05",
          name: "Fakultas Ekonomi dan Bisnis",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "66666666-6666-6666-6666-666666666666",
          code: "06",
          name: "Fakultas Peternakan",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "77777777-7777-7777-7777-777777777777",
          code: "07",
          name: "Fakultas Ilmu Budaya",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "88888888-8888-8888-8888-888888888888",
          code: "08",
          name: "Fakultas Ilmu Sosial dan Ilmu Politik",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "99999999-9999-9999-9999-999999999999",
          code: "09",
          name: "Fakultas Teknik",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "10101010-1010-1010-1010-101010101010",
          code: "10",
          name: "Fakultas Farmasi",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "11111111-1111-1111-1111-111111111110",
          code: "11",
          name: "Fakultas Teknologi Pertanian",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "12121212-1212-1212-1212-121212121212",
          code: "12",
          name: "Fakultas Kesehatan Masyarakat",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "13131313-1313-1313-1313-131313131313",
          code: "13",
          name: "Fakultas Keperawatan",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "14141414-1414-1414-1414-141414141414",
          code: "14",
          name: "Fakultas Kedokteran Gigi",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "15151515-1515-1515-1515-151515151515",
          code: "15",
          name: "Fakultas Teknologi Informasi",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("faculties", null, {});
  },
};
