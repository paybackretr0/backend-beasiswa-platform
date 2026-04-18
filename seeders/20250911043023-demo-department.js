"use strict";

/** @type {import('sequelize-cli').Migration} */

const departmentSeed = [
  // Fakultas Hukum (01)
  {
    faculty_id: "11111111-1111-1111-1111-111111111111",
    code: "1",
    name: "Hukum",
  },

  // Fakultas Pertanian (02)
  {
    faculty_id: "22222222-2222-2222-2222-222222222222",
    code: "1",
    name: "Agroteknologi",
  },
  {
    faculty_id: "22222222-2222-2222-2222-222222222222",
    code: "2",
    name: "Agribisnis",
  },
  {
    faculty_id: "22222222-2222-2222-2222-222222222222",
    code: "3",
    name: "Ilmu Tanah",
  },
  {
    faculty_id: "22222222-2222-2222-2222-222222222222",
    code: "4",
    name: "Proteksi Tanaman",
  },
  {
    faculty_id: "22222222-2222-2222-2222-222222222222",
    code: "5",
    name: "Penyuluhan Pertanian",
  },
  {
    faculty_id: "22222222-2222-2222-2222-222222222222",
    code: "6",
    name: "Agroekoteknologi (Kampus III)",
  },

  // Fakultas Kedokteran (03)
  {
    faculty_id: "33333333-3333-3333-3333-333333333333",
    code: "1",
    name: "Kedokteran",
  },
  {
    faculty_id: "33333333-3333-3333-3333-333333333333",
    code: "2",
    name: "Psikologi",
  },
  {
    faculty_id: "33333333-3333-3333-3333-333333333333",
    code: "3",
    name: "Kebidanan",
  },
  {
    faculty_id: "33333333-3333-3333-3333-333333333333",
    code: "4",
    name: "Ilmu Biomedis",
  },

  // Fakultas MIPA (04)
  {
    faculty_id: "44444444-4444-4444-4444-444444444444",
    code: "1",
    name: "Kimia",
  },
  {
    faculty_id: "44444444-4444-4444-4444-444444444444",
    code: "2",
    name: "Biologi",
  },
  {
    faculty_id: "44444444-4444-4444-4444-444444444444",
    code: "3",
    name: "Matematika",
  },
  {
    faculty_id: "44444444-4444-4444-4444-444444444444",
    code: "4",
    name: "Fisika",
  },
  {
    faculty_id: "44444444-4444-4444-4444-444444444444",
    code: "5",
    name: "Statistika dan Sains Data",
  },

  // Fakultas Ekonomi dan Bisnis (05)
  {
    faculty_id: "55555555-5555-5555-5555-555555555555",
    code: "1",
    name: "Ekonomi",
  },
  {
    faculty_id: "55555555-5555-5555-5555-555555555555",
    code: "2",
    name: "Manajemen",
  },
  {
    faculty_id: "55555555-5555-5555-5555-555555555555",
    code: "3",
    name: "Akuntansi",
  },
  {
    faculty_id: "55555555-5555-5555-5555-555555555555",
    code: "4",
    name: "Ekonomi Islam",
  },
  {
    faculty_id: "55555555-5555-5555-5555-555555555555",
    code: "5",
    name: "Kewirausahaan",
  },
  {
    faculty_id: "55555555-5555-5555-5555-555555555555",
    code: "6",
    name: "Ekonomi Pembangunan (Kampus II)",
  },
  {
    faculty_id: "55555555-5555-5555-5555-555555555555",
    code: "7",
    name: "Manajemen (Kampus II)",
  },
  {
    faculty_id: "55555555-5555-5555-5555-555555555555",
    code: "8",
    name: "Vokasi",
  },

  // Fakultas Peternakan (06)
  {
    faculty_id: "66666666-6666-6666-6666-666666666666",
    code: "1",
    name: "Peternakan",
  },
  {
    faculty_id: "66666666-6666-6666-6666-666666666666",
    code: "2",
    name: "Peternakan (Kampus II)",
  },
  {
    faculty_id: "66666666-6666-6666-6666-666666666666",
    code: "3",
    name: "Nutrisi dan Teknologi Pakan Ternak",
  },

  // Fakultas Ilmu Budaya (07)
  {
    faculty_id: "77777777-7777-7777-7777-777777777777",
    code: "1",
    name: "Sejarah",
  },
  {
    faculty_id: "77777777-7777-7777-7777-777777777777",
    code: "2",
    name: "Sastra Indonesia",
  },
  {
    faculty_id: "77777777-7777-7777-7777-777777777777",
    code: "3",
    name: "Sastra Inggris",
  },
  {
    faculty_id: "77777777-7777-7777-7777-777777777777",
    code: "4",
    name: "Sastra Minangkabau",
  },
  {
    faculty_id: "77777777-7777-7777-7777-777777777777",
    code: "5",
    name: "Sastra Jepang",
  },
  {
    faculty_id: "77777777-7777-7777-7777-777777777777",
    code: "6",
    name: "Arkeologi",
  },

  // Fakultas Ilmu Sosial dan Ilmu Politik (08)
  {
    faculty_id: "88888888-8888-8888-8888-888888888888",
    code: "1",
    name: "Sosiologi",
  },
  {
    faculty_id: "88888888-8888-8888-8888-888888888888",
    code: "2",
    name: "Ilmu Politik",
  },
  {
    faculty_id: "88888888-8888-8888-8888-888888888888",
    code: "3",
    name: "Antropologi Sosial",
  },
  {
    faculty_id: "88888888-8888-8888-8888-888888888888",
    code: "4",
    name: "Hubungan Internasional",
  },
  {
    faculty_id: "88888888-8888-8888-8888-888888888888",
    code: "5",
    name: "Ilmu Komunikasi",
  },
  {
    faculty_id: "88888888-8888-8888-8888-888888888888",
    code: "6",
    name: "Administrasi Publik",
  },

  // Fakultas Teknik (09)
  {
    faculty_id: "99999999-9999-9999-9999-999999999999",
    code: "1",
    name: "Teknik Sipil",
  },
  {
    faculty_id: "99999999-9999-9999-9999-999999999999",
    code: "2",
    name: "Teknik Mesin",
  },
  {
    faculty_id: "99999999-9999-9999-9999-999999999999",
    code: "3",
    name: "Teknik Industri",
  },
  {
    faculty_id: "99999999-9999-9999-9999-999999999999",
    code: "4",
    name: "Teknik Elektro",
  },
  {
    faculty_id: "99999999-9999-9999-9999-999999999999",
    code: "5",
    name: "Teknik Lingkungan",
  },
  {
    faculty_id: "99999999-9999-9999-9999-999999999999",
    code: "6",
    name: "Arsitektur",
  },

  // Fakultas Farmasi (10)
  {
    faculty_id: "10101010-1010-1010-1010-101010101010",
    code: "1",
    name: "Farmasi",
  },

  // Fakultas Teknologi Pertanian (11)
  {
    faculty_id: "11111111-1111-1111-1111-111111111110",
    code: "1",
    name: "Teknologi Pangan dan Hasil Pertanian",
  },
  {
    faculty_id: "11111111-1111-1111-1111-111111111110",
    code: "2",
    name: "Teknik Pertanian dan Biosistem",
  },
  {
    faculty_id: "11111111-1111-1111-1111-111111111110",
    code: "3",
    name: "Teknologi Industri Pertanian",
  },

  // Fakultas Kesehatan Masyarakat (12)
  {
    faculty_id: "12121212-1212-1212-1212-121212121212",
    code: "1",
    name: "Kesehatan Masyarakat",
  },
  {
    faculty_id: "12121212-1212-1212-1212-121212121212",
    code: "2",
    name: "Gizi",
  },

  // Fakultas Keperawatan (13)
  {
    faculty_id: "13131313-1313-1313-1313-131313131313",
    code: "1",
    name: "Keperawatan",
  },

  // Fakultas Kedokteran Gigi (14)
  {
    faculty_id: "14141414-1414-1414-1414-141414141414",
    code: "1",
    name: "Kedokteran Gigi",
  },

  // Fakultas Teknologi Informasi (15)
  // Pakai id tetap supaya cocok dengan seeder study_program lama
  {
    id: "11111111-1111-1111-1111-111111111111",
    faculty_id: "15151515-1515-1515-1515-151515151515",
    code: "1",
    name: "Teknik Komputer",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    faculty_id: "15151515-1515-1515-1515-151515151515",
    code: "2",
    name: "Sistem Informasi",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    faculty_id: "15151515-1515-1515-1515-151515151515",
    code: "3",
    name: "Informatika",
  },
];

function generatedDepartmentId(index) {
  return `deaa0000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function buildRows() {
  const now = new Date();

  return departmentSeed.map((item, index) => ({
    id: item.id || generatedDepartmentId(index + 1),
    faculty_id: item.faculty_id,
    code: item.code,
    name: item.name,
    is_active: true,
    createdAt: now,
    updatedAt: now,
  }));
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("departments", buildRows(), {});
  },

  async down(queryInterface, Sequelize) {
    const rows = buildRows();
    const ids = rows.map((row) => row.id);

    await queryInterface.bulkDelete(
      "departments",
      {
        id: ids,
      },
      {},
    );
  },
};
