"use strict";
const bcrypt = require("bcrypt");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash("password123", 10);

    await queryInterface.bulkInsert(
      "users",
      [
        {
          email: "superadmin.kemahasiswaan@unand.ac.id",
          password: hashedPassword,
          full_name: "Super Administrator",
          role: "SUPERADMIN",
          nim: null,
          department_id: null,
          gender: "L",
          is_active: true,
          last_login_at: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          email: "ditmawa@unand.ac.id",
          password: hashedPassword,
          full_name: "Pimpinan Direktorat Kemahasiswaan",
          role: "PIMPINAN_DITMAWA",
          nim: null,
          department_id: null,
          gender: "L",
          is_active: true,
          last_login_at: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          email: "dekan.teknik@unand.ac.id",
          password: hashedPassword,
          full_name: "Dekan Fakultas Teknik",
          role: "PIMPINAN_FAKULTAS",
          nim: null,
          department_id: null,
          gender: "L",
          is_active: true,
          last_login_at: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          email: "dekan.fti@unand.ac.id",
          password: hashedPassword,
          full_name: "Dekan Fakultas Teknologi Informasi",
          role: "PIMPINAN_FAKULTAS",
          nim: null,
          department_id: null,
          gender: "P",
          is_active: true,
          last_login_at: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          email: "verifikator1@unand.ac.id",
          password: hashedPassword,
          full_name: "Verifikator Beasiswa 1",
          role: "VERIFIKATOR",
          nim: null,
          department_id: null,
          gender: "P",
          is_active: true,
          last_login_at: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          email: "verifikator2@unand.ac.id",
          password: hashedPassword,
          full_name: "Verifikator Beasiswa 2",
          role: "VERIFIKATOR",
          nim: null,
          department_id: null,
          gender: "L",
          is_active: true,
          last_login_at: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },

        {
          email: "2211523030_khalied@student.unand.ac.id",
          password: hashedPassword,
          full_name: "Khalied Nauly Maturino",
          role: "MAHASISWA",
          nim: "2211523030",
          department_id: 2,
          gender: "L",
          is_active: true,
          last_login_at: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("users", null, {});
  },
};
