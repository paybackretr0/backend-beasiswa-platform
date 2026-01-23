const {
  Application,
  User,
  Scholarship,
  ScholarshipSchema,
  Faculty,
  Department,
  StudyProgram,
  ActivityLog,
  sequelize,
} = require("../models");
const { errorResponse } = require("../utils/response");
const {
  applyHeaderStyle,
  applyDataRowStyle,
  applyTotalRowStyle,
  applyCenterAlignment,
} = require("../utils/style");
const { Op } = require("sequelize");
const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

const getStatusLabel = (status) => {
  const statusMap = {
    MENUNGGU_VERIFIKASI: "Menunggu Verifikasi",
    VERIFIED: "Terverifikasi - Menunggu Validasi",
    REJECTED: "Ditolak",
    VALIDATED: "Disetujui",
    REVISION_NEEDED: "Perlu Revisi",
  };
  return statusMap[status] || status;
};

const getSummaryData = async (year) => {
  const totalPendaftar = await Application.count({
    where: {
      status: { [Op.ne]: "DRAFT" },
      createdAt: {
        [Op.gte]: new Date(`${year}-01-01`),
        [Op.lte]: new Date(`${year}-12-31`),
      },
    },
  });

  const totalBeasiswa = await Scholarship.count({
    where: {
      year: year,
    },
  });

  const beasiswaMasihBuka = await Scholarship.count({
    where: {
      year: year,
      is_active: true,
      end_date: { [Op.gte]: new Date() },
    },
  });

  const beasiswaSudahTutup = await Scholarship.count({
    where: {
      year: year,
      end_date: { [Op.lt]: new Date() },
    },
  });

  const totalMahasiswa = await User.count({
    where: {
      role: "MAHASISWA",
      is_active: true,
    },
  });

  return {
    totalPendaftar,
    totalBeasiswa,
    beasiswaMasihBuka,
    beasiswaSudahTutup,
    totalMahasiswa,
  };
};

const getSelectionSummaryData = async (year) => {
  const [
    lolosSeleksiBerkas,
    menungguVerifikasi,
    terverifikasi,
    tidakLolosSeleksi,
    perluRevisi,
  ] = await Promise.all([
    Application.count({
      where: {
        status: "VALIDATED",
        createdAt: {
          [Op.gte]: new Date(`${year}-01-01`),
          [Op.lte]: new Date(`${year}-12-31`),
        },
      },
    }),
    Application.count({
      where: {
        status: "MENUNGGU_VERIFIKASI",
        createdAt: {
          [Op.gte]: new Date(`${year}-01-01`),
          [Op.lte]: new Date(`${year}-12-31`),
        },
      },
    }),
    Application.count({
      where: {
        status: "VERIFIED",
        createdAt: {
          [Op.gte]: new Date(`${year}-01-01`),
          [Op.lte]: new Date(`${year}-12-31`),
        },
      },
    }),
    Application.count({
      where: {
        status: "REJECTED",
        createdAt: {
          [Op.gte]: new Date(`${year}-01-01`),
          [Op.lte]: new Date(`${year}-12-31`),
        },
      },
    }),
    Application.count({
      where: {
        status: "REVISION_NEEDED",
        createdAt: {
          [Op.gte]: new Date(`${year}-01-01`),
          [Op.lte]: new Date(`${year}-12-31`),
        },
      },
    }),
  ]);

  return {
    lolosSeleksiBerkas,
    menungguVerifikasi,
    terverifikasi,
    tidakLolosSeleksi,
    perluRevisi,
  };
};

const getApplicationsListData = async (filters) => {
  const {
    year = new Date().getFullYear(),
    fakultas,
    departemen,
    prodi,
    gender,
    search,
  } = filters;

  let whereCondition = {
    status: { [Op.ne]: "DRAFT" },
    createdAt: {
      [Op.gte]: new Date(`${year}-01-01`),
      [Op.lte]: new Date(`${year}-12-31`),
    },
  };

  let userWhereCondition = {
    role: "MAHASISWA",
  };
  let studyProgramWhereCondition = {};
  let departmentWhereCondition = {};
  let facultyWhereCondition = {};

  if (gender && gender !== "Semua") {
    userWhereCondition.gender = gender === "Laki-laki" ? "L" : "P";
  }

  if (prodi && prodi !== "Semua") {
    studyProgramWhereCondition.degree = prodi;
  }

  if (departemen && departemen !== "Semua") {
    departmentWhereCondition.name = departemen;
  }

  if (fakultas && fakultas !== "Semua") {
    facultyWhereCondition.name = fakultas;
  }

  if (search) {
    userWhereCondition[Op.or] = [
      { full_name: { [Op.like]: `%${search}%` } },
      { nim: { [Op.like]: `%${search}%` } },
    ];
  }

  // ✅ FIX: Include melalui ScholarshipSchema
  const applications = await Application.findAll({
    where: whereCondition,
    include: [
      {
        model: User,
        as: "student",
        where: userWhereCondition,
        attributes: ["id", "full_name", "nim", "gender"],
        include: [
          {
            model: StudyProgram,
            as: "study_program",
            where: Object.keys(studyProgramWhereCondition).length
              ? studyProgramWhereCondition
              : undefined,
            required: false,
            attributes: ["id", "degree"],
            include: [
              {
                model: Department,
                as: "department",
                where: Object.keys(departmentWhereCondition).length
                  ? departmentWhereCondition
                  : undefined,
                required: false,
                attributes: ["id", "name"],
                include: [
                  {
                    model: Faculty,
                    as: "faculty",
                    where: Object.keys(facultyWhereCondition).length
                      ? facultyWhereCondition
                      : undefined,
                    required: false,
                    attributes: ["id", "name"],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        model: ScholarshipSchema,
        as: "schema",
        attributes: ["id", "name"],
        include: [
          {
            model: Scholarship,
            as: "scholarship",
            attributes: ["id", "name"],
          },
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  return applications.map((app) => ({
    id: app.id,
    nama: app.student?.full_name || "N/A",
    nim: app.student?.nim || "N/A",
    fakultas: app.student?.study_program?.department?.faculty?.name || "N/A",
    departemen: app.student?.study_program?.department?.name || "N/A",
    prodi: app.student?.study_program?.degree || "N/A",
    gender: app.student?.gender === "L" ? "Laki-laki" : "Perempuan",
    status: getStatusLabel(app.status),
    beasiswa: app.schema?.scholarship?.name || "N/A",
    tanggalDaftar: app.createdAt,
  }));
};

const getMonthlyTrendData = async (year) => {
  const monthlyData = await sequelize.query(
    `
    SELECT 
      MONTH(createdAt) as month,
      COUNT(*) as value
    FROM applications 
    WHERE status != 'DRAFT' 
      AND YEAR(createdAt) = :year
    GROUP BY MONTH(createdAt)
    ORDER BY month
    `,
    {
      replacements: { year },
      type: sequelize.QueryTypes.SELECT,
    },
  );

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];

  return months.map((month, index) => {
    const data = monthlyData.find((item) => item.month === index + 1);
    return {
      label: month,
      value: data ? data.value : 0,
    };
  });
};

const getFacultyDistributionData = async (year) => {
  return await sequelize.query(
    `
    SELECT 
      f.name as label,
      COUNT(a.id) as value
    FROM faculties f
    LEFT JOIN departments d ON f.id = d.faculty_id
    LEFT JOIN users u ON u.department_id = d.id AND u.role = 'MAHASISWA'
    LEFT JOIN applications a ON u.id = a.student_id 
      AND a.status != 'DRAFT'
      AND YEAR(a.createdAt) = :year
    WHERE f.is_active = true
    GROUP BY f.id, f.name
    HAVING COUNT(a.id) > 0
    ORDER BY value DESC
    LIMIT 10
    `,
    {
      replacements: { year },
      type: sequelize.QueryTypes.SELECT,
    },
  );
};

const getDepartmentDistributionData = async (year) => {
  return await sequelize.query(
    `
    SELECT 
      d.name as label,
      COUNT(a.id) as value
    FROM departments d
    LEFT JOIN users u ON u.department_id = d.id AND u.role = 'MAHASISWA'
    LEFT JOIN applications a ON u.id = a.student_id 
      AND a.status != 'DRAFT'
      AND YEAR(a.createdAt) = :year
    WHERE d.is_active = true
    GROUP BY d.id, d.name
    HAVING COUNT(a.id) > 0
    ORDER BY value DESC
    LIMIT 10
    `,
    {
      replacements: { year },
      type: sequelize.QueryTypes.SELECT,
    },
  );
};

const getStudyProgramDistributionData = async (year) => {
  return await sequelize.query(
    `
    SELECT 
      sp.degree as label,
      COUNT(a.id) as value
    FROM study_programs sp
    LEFT JOIN users u ON u.study_program_id = sp.id AND u.role = 'MAHASISWA'
    LEFT JOIN applications a ON u.id = a.student_id 
      AND a.status != 'DRAFT'
      AND YEAR(a.createdAt) = :year
    WHERE sp.is_active = true
    GROUP BY sp.id, sp.degree
    HAVING COUNT(a.id) > 0
    ORDER BY value DESC
    LIMIT 10
    `,
    {
      replacements: { year },
      type: sequelize.QueryTypes.SELECT,
    },
  );
};

const getGenderDistributionData = async (year) => {
  const genderData = await sequelize.query(
    `
    SELECT 
      u.gender as label,
      COUNT(a.id) as value,
      CASE 
        WHEN u.gender = 'L' THEN '#2D60FF'
        WHEN u.gender = 'P' THEN '#FF69B4'
        ELSE '#9CA3AF'
      END as color
    FROM users u
    LEFT JOIN applications a ON u.id = a.student_id 
      AND a.status != 'DRAFT'
      AND YEAR(a.createdAt) = :year
    WHERE u.role = 'MAHASISWA' AND a.id IS NOT NULL
    GROUP BY u.gender
    HAVING COUNT(a.id) > 0
    `,
    {
      replacements: { year },
      type: sequelize.QueryTypes.SELECT,
    },
  );

  return genderData.map((item) => ({
    ...item,
    label: item.label === "L" ? "Laki-laki" : "Perempuan",
  }));
};

const getOverallRecapitulation = async (year) => {
  const result = await sequelize.query(
    `
    SELECT 
      ROW_NUMBER() OVER (ORDER BY s.name) as no,
      s.name as beasiswa,
      COUNT(DISTINCT a.id) as jumlah_pendaftar,
      COUNT(DISTINCT CASE WHEN a.status = 'VALIDATED' THEN a.id END) as jumlah_penerima
    FROM scholarships s
    LEFT JOIN scholarship_schemas ss ON s.id = ss.scholarship_id
    LEFT JOIN applications a ON ss.id = a.schema_id 
      AND a.status != 'DRAFT'
      AND YEAR(a.createdAt) = :year
    WHERE s.year = :year AND s.is_active = true
    GROUP BY s.id, s.name
    HAVING COUNT(DISTINCT a.id) > 0
    ORDER BY s.name
    `,
    {
      replacements: { year },
      type: sequelize.QueryTypes.SELECT,
    },
  );

  const total = {
    jumlah_pendaftar: result.reduce(
      (sum, item) => sum + parseInt(item.jumlah_pendaftar || 0),
      0,
    ),
    jumlah_penerima: result.reduce(
      (sum, item) => sum + parseInt(item.jumlah_penerima || 0),
      0,
    ),
  };

  return { data: result, total };
};

const getOngoingRecipients = async (year) => {
  return await sequelize.query(
    `
    SELECT 
      u.full_name as nama,
      u.nim,
      f.name as fakultas,
      d.name as departemen,
      sp.degree as prodi,
      s.name as beasiswa,
      a.createdAt as tanggal_diterima,
      s.duration_semesters as durasi_semester,
      DATE_ADD(a.createdAt, INTERVAL (s.duration_semesters * 6) MONTH) as estimasi_selesai,
      CASE 
        WHEN DATE_ADD(a.createdAt, INTERVAL (s.duration_semesters * 6) MONTH) > NOW() 
        THEN 'Masih Berjalan' 
        ELSE 'Sudah Selesai' 
      END as status_penerima,
      s.scholarship_value as nilai_beasiswa
    FROM applications a
    INNER JOIN users u ON a.student_id = u.id
    INNER JOIN scholarship_schemas ss ON a.schema_id = ss.id
    INNER JOIN scholarships s ON ss.scholarship_id = s.id
    LEFT JOIN study_programs sp ON u.study_program_id = sp.id
    LEFT JOIN departments d ON sp.department_id = d.id
    LEFT JOIN faculties f ON d.faculty_id = f.id
    WHERE a.status = 'VALIDATED'
      AND YEAR(a.createdAt) = :year
      AND DATE_ADD(a.createdAt, INTERVAL (s.duration_semesters * 6) MONTH) > NOW()
    ORDER BY a.createdAt DESC
    `,
    {
      replacements: { year },
      type: sequelize.QueryTypes.SELECT,
    },
  );
};

const getRecipientsByScholarshipDetail = async (year, scholarshipId) => {
  return await sequelize.query(
    `
    SELECT 
      u.full_name as nama,
      u.nim,
      u.gender,
      f.name as fakultas,
      d.name as departemen,
      sp.degree as prodi,
      u.phone_number as no_hp,
      u.email,
      a.createdAt as tanggal_diterima,
      a.verified_at as tanggal_verifikasi,
      a.validated_at as tanggal_validasi,
      s.scholarship_value as nilai_beasiswa,
      s.duration_semesters as durasi_semester,
      DATE_ADD(a.createdAt, INTERVAL (s.duration_semesters * 6) MONTH) as estimasi_selesai
    FROM applications a
    INNER JOIN users u ON a.student_id = u.id
    INNER JOIN scholarship_schemas ss ON a.schema_id = ss.id
    INNER JOIN scholarships s ON ss.scholarship_id = s.id
    LEFT JOIN study_programs sp ON u.study_program_id = sp.id
    LEFT JOIN departments d ON sp.department_id = d.id
    LEFT JOIN faculties f ON d.faculty_id = f.id
    WHERE a.status = 'VALIDATED'
      AND s.id = :scholarshipId
      AND YEAR(a.createdAt) = :year
    ORDER BY 
      CASE 
        WHEN a.status = 'VALIDATED' THEN 1
        WHEN a.status = 'VERIFIED' THEN 2
        WHEN a.status = 'MENUNGGU_VERIFIKASI' THEN 3
        WHEN a.status = 'REJECTED' THEN 4
      END,
      a.createdAt DESC
    `,
    {
      replacements: { year, scholarshipId },
      type: sequelize.QueryTypes.SELECT,
    },
  );
};

const getApplicantsByScholarshipDetail = async (year, scholarshipId) => {
  return await sequelize.query(
    `
    SELECT 
      u.full_name as nama,
      u.nim,
      u.gender,
      f.name as fakultas,
      d.name as departemen,
      sp.degree as prodi,
      u.phone_number as no_hp,
      u.email,
      a.createdAt as tanggal_daftar,
      a.status,
      CASE 
        WHEN a.status = 'MENUNGGU_VERIFIKASI' THEN 'Menunggu Verifikasi'
        WHEN a.status = 'VERIFIED' THEN 'Terverifikasi - Menunggu Validasi'
        WHEN a.status = 'VALIDATED' THEN 'Disetujui'
        WHEN a.status = 'REJECTED' THEN 'Ditolak'
        WHEN a.status = 'REVISION_NEEDED' THEN 'Perlu Revisi'
        ELSE a.status
      END as status_label,
      COALESCE(
        (SELECT comment_text 
         FROM application_comments 
         WHERE application_id = a.id 
           AND comment_type = 'REJECTION'
         ORDER BY createdAt DESC 
         LIMIT 1), 
        '-'
      ) as alasan_ditolak
    FROM applications a
    INNER JOIN users u ON a.student_id = u.id
    INNER JOIN scholarship_schemas ss ON a.schema_id = ss.id
    INNER JOIN scholarships s ON ss.scholarship_id = s.id
    LEFT JOIN study_programs sp ON u.study_program_id = sp.id
    LEFT JOIN departments d ON sp.department_id = d.id
    LEFT JOIN faculties f ON d.faculty_id = f.id
    WHERE a.status != 'DRAFT'
      AND s.id = :scholarshipId
      AND YEAR(a.createdAt) = :year
    ORDER BY 
      CASE 
        WHEN a.status = 'VALIDATED' THEN 1
        WHEN a.status = 'VERIFIED' THEN 2
        WHEN a.status = 'MENUNGGU_VERIFIKASI' THEN 3
        WHEN a.status = 'REVISION_NEEDED' THEN 4
        WHEN a.status = 'REJECTED' THEN 5
      END,
      a.createdAt DESC
    `,
    {
      replacements: { year, scholarshipId },
      type: sequelize.QueryTypes.SELECT,
    },
  );
};

const getAllScholarshipsWithData = async (year) => {
  return await sequelize.query(
    `
    SELECT DISTINCT
      s.id,
      s.name,
      COUNT(CASE WHEN a.status = 'VALIDATED' THEN 1 END) as jumlah_penerima,
      COUNT(CASE WHEN a.status != 'DRAFT' THEN 1 END) as jumlah_pendaftar
    FROM scholarships s
    LEFT JOIN scholarship_schemas ss ON s.id = ss.scholarship_id
    LEFT JOIN applications a ON ss.id = a.schema_id 
      AND YEAR(a.createdAt) = :year
    WHERE s.year = :year AND s.is_active = true
    GROUP BY s.id, s.name
    HAVING jumlah_pendaftar > 0
    ORDER BY s.name
    `,
    {
      replacements: { year },
      type: sequelize.QueryTypes.SELECT,
    },
  );
};

const exportLaporanBeasiswa = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const [
      mainSummary,
      selectionSummary,
      pendaftar,
      monthlyData,
      fakultasData,
      departemenData,
      prodiData,
      genderData,
      overallRecap,
      ongoingRecipients,
      scholarshipsWithData,
    ] = await Promise.all([
      getSummaryData(year),
      getSelectionSummaryData(year),
      getApplicationsListData({ year }),
      getMonthlyTrendData(year),
      getFacultyDistributionData(year),
      getDepartmentDistributionData(year),
      getStudyProgramDistributionData(year),
      getGenderDistributionData(year),
      getOverallRecapitulation(year),
      getOngoingRecipients(year),
      getAllScholarshipsWithData(year),
    ]);

    const workbook = new ExcelJS.Workbook();

    const summarySheet = workbook.addWorksheet("Ringkasan");
    summarySheet.columns = [
      { header: "Keterangan", key: "keterangan", width: 40 },
      { header: "Nilai", key: "nilai", width: 20 },
    ];

    applyHeaderStyle(summarySheet.getRow(1));

    const summaryData = [
      { keterangan: "RINGKASAN UTAMA", nilai: "" },
      { keterangan: "Jumlah Pendaftar", nilai: mainSummary.totalPendaftar },
      { keterangan: "Jumlah Beasiswa", nilai: mainSummary.totalBeasiswa },
      {
        keterangan: "Beasiswa Masih Buka",
        nilai: mainSummary.beasiswaMasihBuka,
      },
      {
        keterangan: "Beasiswa Sudah Tutup",
        nilai: mainSummary.beasiswaSudahTutup,
      },
      { keterangan: "Total Mahasiswa", nilai: mainSummary.totalMahasiswa },
      { keterangan: "", nilai: "" },
      { keterangan: "RINGKASAN SELEKSI", nilai: "" },
      {
        keterangan: "Jumlah Mahasiswa Diterima",
        nilai: selectionSummary.lolosSeleksiBerkas,
      },
      {
        keterangan: "Menunggu Verifikasi",
        nilai: selectionSummary.menungguVerifikasi,
      },
      {
        keterangan: "Terverifikasi - Menunggu Validasi",
        nilai: selectionSummary.terverifikasi,
      },
      {
        keterangan: "Tidak Lolos Seleksi",
        nilai: selectionSummary.tidakLolosSeleksi,
      },
    ];

    summaryData.forEach((item, index) => {
      const row = summarySheet.addRow(item);

      if (
        item.keterangan === "RINGKASAN UTAMA" ||
        item.keterangan === "RINGKASAN SELEKSI"
      ) {
        row.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" },
        };
        row.height = 25;
      } else if (item.keterangan !== "") {
        applyDataRowStyle(row, index);
      }
    });

    applyCenterAlignment(summarySheet, ["nilai"]);

    const recapSheet = workbook.addWorksheet("Rekapitulasi Keseluruhan");
    recapSheet.columns = [
      { header: "No", key: "no", width: 8 },
      { header: "Nama Beasiswa", key: "beasiswa", width: 40 },
      { header: "Jumlah Pendaftar", key: "jumlah_pendaftar", width: 20 },
      { header: "Jumlah Penerima", key: "jumlah_penerima", width: 20 },
    ];

    applyHeaderStyle(recapSheet.getRow(1));

    if (overallRecap.data && overallRecap.data.length > 0) {
      overallRecap.data.forEach((item, index) => {
        const row = recapSheet.addRow(item);
        applyDataRowStyle(row, index);
      });

      recapSheet.addRow({});
      const totalRow = recapSheet.addRow({
        no: "",
        beasiswa: "TOTAL",
        jumlah_pendaftar: overallRecap.total.jumlah_pendaftar,
        jumlah_penerima: overallRecap.total.jumlah_penerima,
      });
      applyTotalRowStyle(totalRow);
    }

    applyCenterAlignment(recapSheet, [
      "no",
      "jumlah_pendaftar",
      "jumlah_penerima",
    ]);

    const ongoingSheet = workbook.addWorksheet("Penerima Sedang Berjalan");
    ongoingSheet.columns = [
      { header: "Nama", key: "nama", width: 25 },
      { header: "NIM", key: "nim", width: 18 },
      { header: "Fakultas", key: "fakultas", width: 30 },
      { header: "Departemen", key: "departemen", width: 30 },
      { header: "Program Studi", key: "prodi", width: 20 },
      { header: "Beasiswa", key: "beasiswa", width: 35 },
      { header: "Durasi (Semester)", key: "durasi_semester", width: 18 },
      { header: "Tanggal Diterima", key: "tanggal_diterima", width: 20 },
      { header: "Estimasi Selesai", key: "estimasi_selesai", width: 20 },
      { header: "Status", key: "status_penerima", width: 20 },
      { header: "Nilai Beasiswa (Rp)", key: "nilai_beasiswa", width: 22 },
    ];

    applyHeaderStyle(ongoingSheet.getRow(1));

    if (ongoingRecipients && ongoingRecipients.length > 0) {
      ongoingRecipients.forEach((item, index) => {
        const row = ongoingSheet.addRow({
          nama: item.nama,
          nim: item.nim,
          fakultas: item.fakultas || "N/A",
          departemen: item.departemen || "N/A",
          prodi: item.prodi || "N/A",
          beasiswa: item.beasiswa,
          durasi_semester: item.durasi_semester || "-",
          tanggal_diterima: item.tanggal_diterima
            ? new Date(item.tanggal_diterima).toLocaleDateString("id-ID")
            : "-",
          estimasi_selesai: item.estimasi_selesai
            ? new Date(item.estimasi_selesai).toLocaleDateString("id-ID")
            : "-",
          status_penerima: item.status_penerima,
          nilai_beasiswa: item.nilai_beasiswa
            ? `Rp ${parseInt(item.nilai_beasiswa).toLocaleString("id-ID")}`
            : "-",
        });
        applyDataRowStyle(row, index);
      });
    }

    applyCenterAlignment(ongoingSheet, [
      "nim",
      "durasi_semester",
      "tanggal_diterima",
      "estimasi_selesai",
      "status_penerima",
      "nilai_beasiswa",
    ]);

    const pendaftarSheet = workbook.addWorksheet("Data Pendaftar");
    pendaftarSheet.columns = [
      { header: "Nama", key: "nama", width: 25 },
      { header: "NIM", key: "nim", width: 18 },
      { header: "Fakultas", key: "fakultas", width: 30 },
      { header: "Departemen", key: "departemen", width: 30 },
      { header: "Program Studi", key: "prodi", width: 20 },
      { header: "Gender", key: "gender", width: 12 },
      { header: "Status", key: "status", width: 30 },
      { header: "Beasiswa", key: "beasiswa", width: 35 },
      { header: "Tanggal Daftar", key: "tanggalDaftar", width: 22 },
    ];

    applyHeaderStyle(pendaftarSheet.getRow(1));

    pendaftar.forEach((item, index) => {
      const row = pendaftarSheet.addRow({
        ...item,
        tanggalDaftar: item.tanggalDaftar
          ? new Date(item.tanggalDaftar).toLocaleDateString("id-ID")
          : "-",
      });
      applyDataRowStyle(row, index);
    });

    applyCenterAlignment(pendaftarSheet, ["nim", "gender", "tanggalDaftar"]);

    const monthlySheet = workbook.addWorksheet("Tren Bulanan");
    monthlySheet.columns = [
      { header: "Bulan", key: "bulan", width: 15 },
      { header: "Jumlah Pendaftar", key: "jumlah", width: 20 },
    ];

    applyHeaderStyle(monthlySheet.getRow(1));

    monthlyData.forEach((item, index) => {
      const row = monthlySheet.addRow({
        bulan: item.label,
        jumlah: item.value,
      });
      applyDataRowStyle(row, index);
    });

    applyCenterAlignment(monthlySheet, ["bulan", "jumlah"]);

    const fakultasSheet = workbook.addWorksheet("Distribusi Fakultas");
    fakultasSheet.columns = [
      { header: "Fakultas", key: "fakultas", width: 40 },
      { header: "Jumlah Pendaftar", key: "jumlah", width: 20 },
    ];

    applyHeaderStyle(fakultasSheet.getRow(1));

    if (fakultasData && fakultasData.length > 0) {
      fakultasData.forEach((item, index) => {
        const row = fakultasSheet.addRow({
          fakultas: item.label,
          jumlah: item.value,
        });
        applyDataRowStyle(row, index);
      });
    }

    applyCenterAlignment(fakultasSheet, ["jumlah"]);

    const departemenSheet = workbook.addWorksheet("Distribusi Departemen");
    departemenSheet.columns = [
      { header: "Departemen", key: "departemen", width: 40 },
      { header: "Jumlah Pendaftar", key: "jumlah", width: 20 },
    ];

    applyHeaderStyle(departemenSheet.getRow(1));

    if (departemenData && departemenData.length > 0) {
      departemenData.forEach((item, index) => {
        const row = departemenSheet.addRow({
          departemen: item.label,
          jumlah: item.value,
        });
        applyDataRowStyle(row, index);
      });
    }

    applyCenterAlignment(departemenSheet, ["jumlah"]);

    const prodiSheet = workbook.addWorksheet("Distribusi Prodi");
    prodiSheet.columns = [
      { header: "Program Studi", key: "prodi", width: 40 },
      { header: "Jumlah Pendaftar", key: "jumlah", width: 20 },
    ];

    applyHeaderStyle(prodiSheet.getRow(1));

    if (prodiData && prodiData.length > 0) {
      prodiData.forEach((item, index) => {
        const row = prodiSheet.addRow({
          prodi: item.label,
          jumlah: item.value,
        });
        applyDataRowStyle(row, index);
      });
    }

    applyCenterAlignment(prodiSheet, ["jumlah"]);

    const genderSheet = workbook.addWorksheet("Distribusi Gender");
    genderSheet.columns = [
      { header: "Gender", key: "gender", width: 20 },
      { header: "Jumlah Pendaftar", key: "jumlah", width: 20 },
    ];

    applyHeaderStyle(genderSheet.getRow(1));

    if (genderData && genderData.length > 0) {
      genderData.forEach((item, index) => {
        const row = genderSheet.addRow({
          gender: item.label,
          jumlah: item.value,
        });
        applyDataRowStyle(row, index);
      });
    }

    applyCenterAlignment(genderSheet, ["gender", "jumlah"]);

    for (const scholarship of scholarshipsWithData) {
      let baseSheetName = scholarship.name.substring(0, 25);
      baseSheetName = baseSheetName.replace(/[\[\]\*\?\/\\:]/g, "");

      if (scholarship.jumlah_penerima > 0) {
        const recipientsDetail = await getRecipientsByScholarshipDetail(
          year,
          scholarship.id,
        );

        const recipientSheetName = `Penerima - ${baseSheetName}`;
        const recipientSheet = workbook.addWorksheet(recipientSheetName);

        recipientSheet.columns = [
          { header: "No", key: "no", width: 8 },
          { header: "Nama", key: "nama", width: 25 },
          { header: "NIM", key: "nim", width: 18 },
          { header: "Gender", key: "gender", width: 12 },
          { header: "Fakultas", key: "fakultas", width: 30 },
          { header: "Departemen", key: "departemen", width: 30 },
          { header: "Program Studi", key: "prodi", width: 20 },
          { header: "No. HP", key: "no_hp", width: 18 },
          { header: "Email", key: "email", width: 30 },
          { header: "Tanggal Diterima", key: "tanggal_diterima", width: 20 },
          {
            header: "Tanggal Verifikasi",
            key: "tanggal_verifikasi",
            width: 20,
          },
          { header: "Tanggal Validasi", key: "tanggal_validasi", width: 20 },
          { header: "Nilai Beasiswa (Rp)", key: "nilai_beasiswa", width: 22 },
          { header: "Durasi (Semester)", key: "durasi_semester", width: 18 },
          { header: "Estimasi Selesai", key: "estimasi_selesai", width: 20 },
        ];

        applyHeaderStyle(recipientSheet.getRow(1));

        if (recipientsDetail && recipientsDetail.length > 0) {
          recipientsDetail.forEach((item, index) => {
            const row = recipientSheet.addRow({
              no: index + 1,
              nama: item.nama,
              nim: item.nim,
              gender: item.gender === "L" ? "Laki-laki" : "Perempuan",
              fakultas: item.fakultas || "N/A",
              departemen: item.departemen || "N/A",
              prodi: item.prodi || "N/A",
              no_hp: item.no_hp || "-",
              email: item.email,
              tanggal_diterima: item.tanggal_diterima
                ? new Date(item.tanggal_diterima).toLocaleDateString("id-ID")
                : "-",
              tanggal_verifikasi: item.tanggal_verifikasi
                ? new Date(item.tanggal_verifikasi).toLocaleDateString("id-ID")
                : "-",
              tanggal_validasi: item.tanggal_validasi
                ? new Date(item.tanggal_validasi).toLocaleDateString("id-ID")
                : "-",
              nilai_beasiswa: item.nilai_beasiswa
                ? `Rp ${parseInt(item.nilai_beasiswa).toLocaleString("id-ID")}`
                : "-",
              durasi_semester: item.durasi_semester || "-",
              estimasi_selesai: item.estimasi_selesai
                ? new Date(item.estimasi_selesai).toLocaleDateString("id-ID")
                : "-",
            });
            applyDataRowStyle(row, index);
          });

          recipientSheet.addRow({});

          const summaryRow = recipientSheet.addRow({
            no: "",
            nama: "TOTAL PENERIMA",
            nim: recipientsDetail.length,
            gender: "",
            fakultas: "",
            departemen: "",
            prodi: "",
            no_hp: "",
            email: "",
            tanggal_diterima: "",
            tanggal_verifikasi: "",
            tanggal_validasi: "",
            nilai_beasiswa: "",
            durasi_semester: "",
            estimasi_selesai: "",
          });
          applyTotalRowStyle(summaryRow);
        }

        applyCenterAlignment(recipientSheet, [
          "no",
          "nim",
          "gender",
          "no_hp",
          "tanggal_diterima",
          "tanggal_verifikasi",
          "tanggal_validasi",
          "nilai_beasiswa",
          "durasi_semester",
          "estimasi_selesai",
        ]);
      }

      const applicantsDetail = await getApplicantsByScholarshipDetail(
        year,
        scholarship.id,
      );

      const applicantSheetName = `Pendaftar - ${baseSheetName}`;
      const applicantSheet = workbook.addWorksheet(applicantSheetName);

      applicantSheet.columns = [
        { header: "No", key: "no", width: 8 },
        { header: "Nama", key: "nama", width: 25 },
        { header: "NIM", key: "nim", width: 18 },
        { header: "Gender", key: "gender", width: 12 },
        { header: "Fakultas", key: "fakultas", width: 30 },
        { header: "Departemen", key: "departemen", width: 30 },
        { header: "Program Studi", key: "prodi", width: 20 },
        { header: "No. HP", key: "no_hp", width: 18 },
        { header: "Email", key: "email", width: 30 },
        { header: "Tanggal Daftar", key: "tanggal_daftar", width: 20 },
        { header: "Status", key: "status_label", width: 35 },
        { header: "Alasan Ditolak", key: "alasan_ditolak", width: 40 },
      ];

      applyHeaderStyle(applicantSheet.getRow(1));

      if (applicantsDetail && applicantsDetail.length > 0) {
        applicantsDetail.forEach((item, index) => {
          const row = applicantSheet.addRow({
            no: index + 1,
            nama: item.nama,
            nim: item.nim,
            gender: item.gender === "L" ? "Laki-laki" : "Perempuan",
            fakultas: item.fakultas || "N/A",
            departemen: item.departemen || "N/A",
            prodi: item.prodi || "N/A",
            no_hp: item.no_hp || "-",
            email: item.email,
            tanggal_daftar: item.tanggal_daftar
              ? new Date(item.tanggal_daftar).toLocaleDateString("id-ID")
              : "-",
            status_label: item.status_label,
            alasan_ditolak: item.alasan_ditolak || "-",
          });
          applyDataRowStyle(row, index);

          if (item.status === "VALIDATED") {
            row.getCell("status_label").fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFD4EDDA" },
            };
            row.getCell("status_label").font = { color: { argb: "FF155724" } };
          } else if (item.status === "REJECTED") {
            row.getCell("status_label").fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF8D7DA" },
            };
            row.getCell("status_label").font = { color: { argb: "FF721C24" } };
          } else if (item.status === "VERIFIED") {
            row.getCell("status_label").fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFD1ECF1" },
            };
            row.getCell("status_label").font = { color: { argb: "FF0C5460" } };
          } else if (item.status === "MENUNGGU_VERIFIKASI") {
            row.getCell("status_label").fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFFF3CD" },
            };
            row.getCell("status_label").font = { color: { argb: "FF856404" } };
          } else if (item.status === "REVISION_NEEDED") {
            row.getCell("status_label").fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFFEAA7" },
            };
            row.getCell("status_label").font = { color: { argb: "FF856404" } };
          }
        });

        applicantSheet.addRow({});

        const statusCounts = {
          validated: applicantsDetail.filter((a) => a.status === "VALIDATED")
            .length,
          verified: applicantsDetail.filter((a) => a.status === "VERIFIED")
            .length,
          pending: applicantsDetail.filter(
            (a) => a.status === "MENUNGGU_VERIFIKASI",
          ).length,
          revision: applicantsDetail.filter(
            (a) => a.status === "REVISION_NEEDED",
          ).length,
          rejected: applicantsDetail.filter((a) => a.status === "REJECTED")
            .length,
        };

        applicantSheet.addRow({
          no: "",
          nama: "RINGKASAN STATUS:",
          nim: "",
          gender: "",
          fakultas: "",
          departemen: "",
          prodi: "",
          no_hp: "",
          email: "",
          tanggal_daftar: "",
          status_label: "",
          alasan_ditolak: "",
        }).font = { bold: true };

        applicantSheet.addRow({
          no: "",
          nama: "- Disetujui",
          nim: statusCounts.validated,
        });
        applicantSheet.addRow({
          no: "",
          nama: "- Terverifikasi",
          nim: statusCounts.verified,
        });
        applicantSheet.addRow({
          no: "",
          nama: "- Menunggu Verifikasi",
          nim: statusCounts.pending,
        });
        applicantSheet.addRow({
          no: "",
          nama: "- Perlu Revisi",
          nim: statusCounts.revision,
        });
        applicantSheet.addRow({
          no: "",
          nama: "- Ditolak",
          nim: statusCounts.rejected,
        });

        applicantSheet.addRow({});
        const totalRow = applicantSheet.addRow({
          no: "",
          nama: "TOTAL PENDAFTAR",
          nim: applicantsDetail.length,
        });
        applyTotalRowStyle(totalRow);
      }

      applyCenterAlignment(applicantSheet, [
        "no",
        "nim",
        "gender",
        "no_hp",
        "tanggal_daftar",
      ]);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `laporan_beasiswa_${year}_${timestamp}.xlsx`;
    const tempDir = path.join(__dirname, "../uploads/exports");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, fileName);

    await workbook.xlsx.writeFile(filePath);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        if (!res.headersSent) {
          return errorResponse(res, "Gagal mengunduh laporan", 500);
        }
      }
      setTimeout(() => {
        fs.unlink(filePath, () => {});
      }, 10000);
    });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "EXPORT_REPORT",
      entity_type: "Application",
      entity_id: req.user.id,
      description: `${userName} mengekspor laporan beasiswa tahun ${year}`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });
  } catch (error) {
    console.error("Error exporting laporan beasiswa:", error);
    if (!res.headersSent) {
      return errorResponse(res, "Gagal mengunduh laporan", 500);
    }
  }
};

module.exports = {
  exportLaporanBeasiswa,
};
