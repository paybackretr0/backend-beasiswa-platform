"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "faculties",
      [
        {
          id: 1,
          code: "01",
          name: "Fakultas Hukum",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          code: "02",
          name: "Fakultas Pertanian",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 3,
          code: "03",
          name: "Fakultas Kedokteran",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 4,
          code: "04",
          name: "Fakultas MIPA",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 5,
          code: "05",
          name: "Fakultas Ekonomi dan Bisnis",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 6,
          code: "06",
          name: "Fakultas Peternakan",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 7,
          code: "07",
          name: "Fakultas Ilmu Budaya",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 8,
          code: "08",
          name: "Fakultas Ilmu Sosial dan Ilmu Politik",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 9,
          code: "09",
          name: "Fakultas Teknik",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 10,
          code: "10",
          name: "Fakultas Farmasi",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 11,
          code: "11",
          name: "Fakultas Teknologi Pertanian",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 12,
          code: "12",
          name: "Fakultas Kesehatan Masyarakat",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 13,
          code: "13",
          name: "Fakultas Keperawatan",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 14,
          code: "14",
          name: "Fakultas Kedokteran Gigi",
          is_active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 15,
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
