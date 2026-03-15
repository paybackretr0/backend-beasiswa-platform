"use strict";

/** @type {import('sequelize-cli').Migration} */

const STUDY_PROGRAM_SEED = [
  // Format: faculty_code, department_code, programs
  {
    faculty_code: "01",
    department_code: "1",
    programs: [{ name: "Hukum", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "02",
    department_code: "1",
    programs: [{ name: "Agroteknologi", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "02",
    department_code: "2",
    programs: [{ name: "Agribisnis", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "02",
    department_code: "3",
    programs: [{ name: "Ilmu Tanah", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "02",
    department_code: "4",
    programs: [{ name: "Proteksi Tanaman", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "02",
    department_code: "5",
    programs: [{ name: "Penyuluhan Pertanian", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "02",
    department_code: "6",
    programs: [
      { name: "Agroekoteknologi (Kampus III)", degree: "S1", code: "1" },
    ],
  },

  {
    faculty_code: "03",
    department_code: "1",
    programs: [{ name: "Kedokteran", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "03",
    department_code: "2",
    programs: [{ name: "Psikologi", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "03",
    department_code: "3",
    programs: [{ name: "Kebidanan", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "03",
    department_code: "4",
    programs: [{ name: "Ilmu Biomedis", degree: "S1", code: "1" }],
  },

  {
    faculty_code: "04",
    department_code: "1",
    programs: [{ name: "Kimia", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "04",
    department_code: "2",
    programs: [{ name: "Biologi", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "04",
    department_code: "3",
    programs: [{ name: "Matematika", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "04",
    department_code: "4",
    programs: [{ name: "Fisika", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "04",
    department_code: "5",
    programs: [{ name: "Statistika dan Sains Data", degree: "S1", code: "1" }],
  },

  {
    faculty_code: "05",
    department_code: "1",
    programs: [{ name: "Ekonomi", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "05",
    department_code: "2",
    programs: [{ name: "Manajemen", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "05",
    department_code: "3",
    programs: [{ name: "Akuntansi", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "05",
    department_code: "4",
    programs: [{ name: "Ekonomi Islam", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "05",
    department_code: "5",
    programs: [{ name: "Kewirausahaan", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "05",
    department_code: "6",
    programs: [
      { name: "Ekonomi Pembangunan (Kampus II)", degree: "S1", code: "1" },
    ],
  },
  {
    faculty_code: "05",
    department_code: "7",
    programs: [{ name: "Manajemen (Kampus II)", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "05",
    department_code: "8",
    programs: [
      { name: "Manajemen Pemasaran", degree: "D3", code: "1" },
      { name: "Akuntansi", degree: "D3", code: "2" },
      { name: "Administrasi Perkantoran", degree: "D3", code: "3" },
      { name: "Perbankan dan Keuangan", degree: "D3", code: "4" },
    ],
  },

  {
    faculty_code: "06",
    department_code: "1",
    programs: [{ name: "Peternakan", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "06",
    department_code: "2",
    programs: [{ name: "Peternakan (Kampus II)", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "06",
    department_code: "3",
    programs: [
      { name: "Nutrisi dan Teknologi Pakan Ternak", degree: "S1", code: "1" },
    ],
  },

  {
    faculty_code: "07",
    department_code: "1",
    programs: [{ name: "Sejarah", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "07",
    department_code: "2",
    programs: [{ name: "Sastra Indonesia", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "07",
    department_code: "3",
    programs: [{ name: "Sastra Inggris", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "07",
    department_code: "4",
    programs: [{ name: "Sastra Minangkabau", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "07",
    department_code: "5",
    programs: [{ name: "Sastra Jepang", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "07",
    department_code: "6",
    programs: [{ name: "Arkeologi", degree: "S1", code: "1" }],
  },

  {
    faculty_code: "08",
    department_code: "1",
    programs: [{ name: "Sosiologi", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "08",
    department_code: "2",
    programs: [{ name: "Ilmu Politik", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "08",
    department_code: "3",
    programs: [{ name: "Antropologi Sosial", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "08",
    department_code: "4",
    programs: [{ name: "Hubungan Internasional", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "08",
    department_code: "5",
    programs: [{ name: "Ilmu Komunikasi", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "08",
    department_code: "6",
    programs: [{ name: "Administrasi Publik", degree: "S1", code: "1" }],
  },

  {
    faculty_code: "09",
    department_code: "1",
    programs: [{ name: "Teknik Sipil", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "09",
    department_code: "2",
    programs: [{ name: "Teknik Mesin", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "09",
    department_code: "3",
    programs: [{ name: "Teknik Industri", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "09",
    department_code: "4",
    programs: [{ name: "Teknik Elektro", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "09",
    department_code: "5",
    programs: [{ name: "Teknik Lingkungan", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "09",
    department_code: "6",
    programs: [{ name: "Arsitektur", degree: "S1", code: "1" }],
  },

  {
    faculty_code: "10",
    department_code: "1",
    programs: [{ name: "Farmasi", degree: "S1", code: "1" }],
  },

  {
    faculty_code: "11",
    department_code: "1",
    programs: [
      { name: "Teknologi Pangan dan Hasil Pertanian", degree: "S1", code: "1" },
    ],
  },
  {
    faculty_code: "11",
    department_code: "2",
    programs: [
      { name: "Teknik Pertanian dan Biosistem", degree: "S1", code: "1" },
    ],
  },
  {
    faculty_code: "11",
    department_code: "3",
    programs: [
      { name: "Teknologi Industri Pertanian", degree: "S1", code: "1" },
    ],
  },

  {
    faculty_code: "12",
    department_code: "1",
    programs: [{ name: "Kesehatan Masyarakat", degree: "S1", code: "1" }],
  },
  {
    faculty_code: "12",
    department_code: "2",
    programs: [{ name: "Gizi", degree: "S1", code: "1" }],
  },

  {
    faculty_code: "13",
    department_code: "1",
    programs: [{ name: "Keperawatan", degree: "S1", code: "1" }],
  },

  {
    faculty_code: "14",
    department_code: "1",
    programs: [{ name: "Kedokteran Gigi", degree: "S1", code: "1" }],
  },

  // FTI: pakai id lama untuk kompatibilitas data demo user
  {
    faculty_code: "15",
    department_code: "1",
    programs: [
      {
        id: "11111111-1111-1111-1111-111111111111",
        name: "Teknik Komputer",
        degree: "S1",
        code: "1",
      },
    ],
  },
  {
    faculty_code: "15",
    department_code: "2",
    programs: [
      {
        id: "22222222-2222-2222-2222-222222222222",
        name: "Sistem Informasi",
        degree: "S1",
        code: "1",
      },
    ],
  },
  {
    faculty_code: "15",
    department_code: "3",
    programs: [
      {
        id: "33333333-3333-3333-3333-333333333333",
        name: "Informatika",
        degree: "S1",
        code: "1",
      },
    ],
  },
];

function generatedStudyProgramId(index) {
  return `spbb0000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function getExpectedIds() {
  const ids = [];
  let seq = 1;

  for (const item of STUDY_PROGRAM_SEED) {
    for (const program of item.programs) {
      ids.push(program.id || generatedStudyProgramId(seq));
      seq += 1;
    }
  }

  return ids;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const [rows] = await queryInterface.sequelize.query(`
      SELECT
        d.id AS department_id,
        d.code AS department_code,
        f.code AS faculty_code
      FROM departments d
      INNER JOIN faculties f ON f.id = d.faculty_id
    `);

    const departmentMap = new Map();
    for (const row of rows) {
      departmentMap.set(
        `${row.faculty_code}:${row.department_code}`,
        row.department_id,
      );
    }

    const now = new Date();
    const insertRows = [];
    let seq = 1;

    for (const item of STUDY_PROGRAM_SEED) {
      const key = `${item.faculty_code}:${item.department_code}`;
      const departmentId = departmentMap.get(key);

      if (!departmentId) {
        // skip jika department belum ada
        continue;
      }

      for (const program of item.programs) {
        insertRows.push({
          id: program.id || generatedStudyProgramId(seq),
          department_id: departmentId,
          name: program.name,
          code: program.code,
          degree: program.degree,
          is_active: true,
          createdAt: now,
          updatedAt: now,
        });
        seq += 1;
      }
    }

    if (insertRows.length > 0) {
      await queryInterface.bulkInsert("study_programs", insertRows, {});
    }
  },

  async down(queryInterface, Sequelize) {
    const ids = getExpectedIds();

    await queryInterface.bulkDelete(
      "study_programs",
      {
        id: ids,
      },
      {},
    );
  },
};
