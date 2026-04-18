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
const { successResponse, errorResponse } = require("../utils/response");
const {
  applyHeaderStyle,
  applyDataRowStyle,
  applyTotalRowStyle,
  applyCenterAlignment,
} = require("../utils/style");
const { Op } = require("sequelize");
const ExcelJS = require("exceljs");
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");
const {
  invalidateApplicationCaches,
  invalidateCacheByPattern,
} = require("../utils/cacheHelper");

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
  let whereCondition = {
    status: { [Op.ne]: "DRAFT" },
  };

  if (year && year !== "all") {
    whereCondition.createdAt = {
      [Op.gte]: new Date(`${year}-01-01`),
      [Op.lte]: new Date(`${year}-12-31`),
    };
  }

  const totalPendaftar = await Application.count({
    where: whereCondition,
  });

  let scholarshipWhere = {};
  if (year && year !== "all") {
    scholarshipWhere.year = year;
  }

  const totalBeasiswa = await Scholarship.count({
    where: scholarshipWhere,
  });

  const beasiswaMasihBuka = await Scholarship.count({
    where: {
      ...scholarshipWhere,
      is_active: true,
      end_date: { [Op.gte]: new Date() },
    },
  });

  const beasiswaSudahTutup = await Scholarship.count({
    where: {
      ...scholarshipWhere,
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
  let whereCondition = {};

  if (year && year !== "all") {
    whereCondition.createdAt = {
      [Op.gte]: new Date(`${year}-01-01`),
      [Op.lte]: new Date(`${year}-12-31`),
    };
  }

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
        ...whereCondition,
      },
    }),
    Application.count({
      where: {
        status: "MENUNGGU_VERIFIKASI",
        ...whereCondition,
      },
    }),
    Application.count({
      where: {
        status: "VERIFIED",
        ...whereCondition,
      },
    }),
    Application.count({
      where: {
        status: "REJECTED",
        ...whereCondition,
      },
    }),
    Application.count({
      where: {
        status: "REVISION_NEEDED",
        ...whereCondition,
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
  };

  if (year && year !== "all") {
    whereCondition.createdAt = {
      [Op.gte]: new Date(`${year}-01-01`),
      [Op.lte]: new Date(`${year}-12-31`),
    };
  }

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
  const yearCondition =
    year && year !== "all" ? "AND YEAR(createdAt) = :year" : "";

  const replacements = year && year !== "all" ? { year: parseInt(year) } : {};

  const monthlyData = await sequelize.query(
    `
    SELECT 
      MONTH(createdAt) as month,
      COUNT(*) as value
    FROM applications 
    WHERE status != 'DRAFT' 
      ${yearCondition}
    GROUP BY MONTH(createdAt)
    ORDER BY month
    `,
    {
      replacements,
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
  const yearCondition =
    year && year !== "all" ? "AND YEAR(a.createdAt) = :year" : "";

  const replacements = year && year !== "all" ? { year: parseInt(year) } : {};

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
      ${yearCondition}
    WHERE f.is_active = true
    GROUP BY f.id, f.name
    HAVING COUNT(a.id) > 0
    ORDER BY value DESC
    LIMIT 10
    `,
    {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    },
  );
};

const getDepartmentDistributionData = async (year) => {
  const yearCondition =
    year && year !== "all" ? "AND YEAR(a.createdAt) = :year" : "";

  const replacements = year && year !== "all" ? { year: parseInt(year) } : {};

  return await sequelize.query(
    `
    SELECT 
      d.name as label,
      COUNT(a.id) as value
    FROM departments d
    LEFT JOIN users u ON u.department_id = d.id AND u.role = 'MAHASISWA'
    LEFT JOIN applications a ON u.id = a.student_id 
      AND a.status != 'DRAFT'
      ${yearCondition}
    WHERE d.is_active = true
    GROUP BY d.id, d.name
    HAVING COUNT(a.id) > 0
    ORDER BY value DESC
    LIMIT 10
    `,
    {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    },
  );
};

const getStudyProgramDistributionData = async (year) => {
  const yearCondition =
    year && year !== "all" ? "AND YEAR(a.createdAt) = :year" : "";

  const replacements = year && year !== "all" ? { year: parseInt(year) } : {};

  return await sequelize.query(
    `
    SELECT 
      sp.degree as label,
      COUNT(a.id) as value
    FROM study_programs sp
    LEFT JOIN users u ON u.study_program_id = sp.id AND u.role = 'MAHASISWA'
    LEFT JOIN applications a ON u.id = a.student_id 
      AND a.status != 'DRAFT'
      ${yearCondition}
    WHERE sp.is_active = true
    GROUP BY sp.id, sp.degree
    HAVING COUNT(a.id) > 0
    ORDER BY value DESC
    LIMIT 10
    `,
    {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    },
  );
};

const getGenderDistributionData = async (year) => {
  const yearCondition =
    year && year !== "all" ? "AND YEAR(a.createdAt) = :year" : "";

  const replacements = year && year !== "all" ? { year: parseInt(year) } : {};

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
      ${yearCondition}
    WHERE u.role = 'MAHASISWA' AND a.id IS NOT NULL
    GROUP BY u.gender
    HAVING COUNT(a.id) > 0
    `,
    {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    },
  );

  return genderData.map((item) => ({
    ...item,
    label: item.label === "L" ? "Laki-laki" : "Perempuan",
  }));
};

const getOverallRecapitulation = async (year) => {
  const yearCondition =
    year && year !== "all" ? "AND YEAR(a.createdAt) = :year" : "";

  const scholarshipYearCondition =
    year && year !== "all" ? "AND s.year = :year" : "";

  const replacements = year && year !== "all" ? { year: parseInt(year) } : {};

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
      ${yearCondition}
    WHERE s.is_active = true ${scholarshipYearCondition}
    GROUP BY s.id, s.name
    HAVING COUNT(DISTINCT a.id) > 0
    ORDER BY s.name
    `,
    {
      replacements,
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
  const yearCondition =
    year && year !== "all" ? "AND YEAR(a.createdAt) = :year" : "";

  const replacements = year && year !== "all" ? { year: parseInt(year) } : {};

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
      ${yearCondition}
      AND DATE_ADD(a.createdAt, INTERVAL (s.duration_semesters * 6) MONTH) > NOW()
    ORDER BY a.createdAt DESC
    `,
    {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    },
  );
};

const getRecipientsByScholarshipDetail = async (year, scholarshipId) => {
  const yearCondition =
    year && year !== "all" ? "AND YEAR(a.createdAt) = :year" : "";

  const replacements =
    year && year !== "all"
      ? { year: parseInt(year), scholarshipId }
      : { scholarshipId };

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
      ${yearCondition}
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
      replacements,
      type: sequelize.QueryTypes.SELECT,
    },
  );
};

const getApplicantsByScholarshipDetail = async (year, scholarshipId) => {
  const yearCondition =
    year && year !== "all" ? "AND YEAR(a.createdAt) = :year" : "";

  const replacements =
    year && year !== "all"
      ? { year: parseInt(year), scholarshipId }
      : { scholarshipId };

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
      ${yearCondition}
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
      replacements,
      type: sequelize.QueryTypes.SELECT,
    },
  );
};

const getAllScholarshipsWithData = async (year) => {
  const yearCondition =
    year && year !== "all" ? "AND YEAR(a.createdAt) = :year" : "";

  const scholarshipYearCondition =
    year && year !== "all" ? "AND s.year = :year" : "";

  const replacements = year && year !== "all" ? { year: parseInt(year) } : {};

  return await sequelize.query(
    `
    SELECT DISTINCT
      s.id,
      s.name,
      s.year,
      s.organizer,
      COUNT(CASE WHEN a.status = 'VALIDATED' THEN 1 END) as jumlah_penerima,
      COUNT(CASE WHEN a.status != 'DRAFT' AND a.status IS NOT NULL THEN 1 END) as jumlah_pendaftar
    FROM scholarships s
    LEFT JOIN scholarship_schemas ss ON s.id = ss.scholarship_id
    LEFT JOIN applications a ON ss.id = a.schema_id 
      ${yearCondition}
    WHERE s.is_active = true ${scholarshipYearCondition} AND s.is_external = false
    GROUP BY s.id, s.name, s.year, s.organizer
    ORDER BY s.name
    `,
    {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    },
  );
};

const exportLaporanBeasiswa = async (req, res) => {
  try {
    let { year = new Date().getFullYear() } = req.query;

    if (year === "all") {
      year = null;
    }

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
      getApplicationsListData({ year: year || "all" }),
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
      } else {
        const emptyRow = applicantSheet.addRow({
          no: "",
          nama: "Belum ada pendaftar untuk beasiswa ini",
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
        });

        emptyRow.font = { italic: true, color: { argb: "FF6C757D" } };
        emptyRow.alignment = { horizontal: "center" };

        applicantSheet.mergeCells(`A${emptyRow.number}:L${emptyRow.number}`);
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
    const yearLabel = year || "Semua_Tahun";
    const fileName = `laporan_beasiswa_${yearLabel}_${timestamp}.xlsx`;
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

const getFilteredApplicantsForExport = async ({
  year,
  scholarshipId,
  schemaId,
  user,
}) => {
  const whereCondition = {
    status: { [Op.ne]: "DRAFT" },
  };

  if (year && year !== "all") {
    whereCondition.createdAt = {
      [Op.gte]: new Date(`${year}-01-01`),
      [Op.lte]: new Date(`${year}-12-31`),
    };
  }

  const role = user?.role;
  const facultyScopedRoles = ["PIMPINAN_FAKULTAS", "VERIFIKATOR_FAKULTAS"];
  const studentWhere = {
    role: "MAHASISWA",
    ...(facultyScopedRoles.includes(role) && user?.faculty_id
      ? { faculty_id: user.faculty_id }
      : {}),
  };

  const schemaWhere = {
    ...(schemaId ? { id: schemaId } : {}),
  };

  const scholarshipWhere = {
    ...(scholarshipId ? { id: scholarshipId } : {}),
  };

  const applications = await Application.findAll({
    where: whereCondition,
    include: [
      {
        model: User,
        as: "student",
        where: studentWhere,
        attributes: ["id", "full_name", "nim", "gender", "email"],
        include: [
          {
            model: StudyProgram,
            as: "study_program",
            required: false,
            attributes: ["id", "degree"],
            include: [
              {
                model: Department,
                as: "department",
                required: false,
                attributes: ["id", "name"],
                include: [
                  {
                    model: Faculty,
                    as: "faculty",
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
        where: Object.keys(schemaWhere).length ? schemaWhere : undefined,
        required: true,
        attributes: ["id", "name"],
        include: [
          {
            model: Scholarship,
            as: "scholarship",
            where: Object.keys(scholarshipWhere).length
              ? scholarshipWhere
              : undefined,
            required: true,
            attributes: ["id", "name", "year"],
          },
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  return applications;
};

const exportPendaftarLaporan = async (req, res) => {
  try {
    const { year = "all", scholarshipId, schemaId } = req.query;

    const applications = await getFilteredApplicantsForExport({
      year,
      scholarshipId,
      schemaId,
      user: req.user,
    });

    const totalPendaftar = applications.length;
    const statusCounts = {
      menungguVerifikasi: applications.filter(
        (a) => a.status === "MENUNGGU_VERIFIKASI",
      ).length,
      menungguValidasi: applications.filter((a) => a.status === "VERIFIED")
        .length,
      divalidasi: applications.filter((a) => a.status === "VALIDATED").length,
      ditolak: applications.filter((a) => a.status === "REJECTED").length,
      perluRevisi: applications.filter((a) => a.status === "REVISION_NEEDED")
        .length,
    };

    const workbook = new ExcelJS.Workbook();

    const summarySheet = workbook.addWorksheet("Statistik Umum");
    summarySheet.columns = [
      { header: "Keterangan", key: "keterangan", width: 40 },
      { header: "Nilai", key: "nilai", width: 22 },
    ];
    applyHeaderStyle(summarySheet.getRow(1));

    const filterScholarshipLabel = scholarshipId
      ? applications[0]?.schema?.scholarship?.name || "Beasiswa Terpilih"
      : "Semua Beasiswa";
    const filterSchemaLabel = schemaId
      ? applications[0]?.schema?.name || "Skema Terpilih"
      : "Semua Skema";

    const summaryRows = [
      { keterangan: "Periode Tahun", nilai: year === "all" ? "Semua" : year },
      { keterangan: "Filter Beasiswa", nilai: filterScholarshipLabel },
      { keterangan: "Filter Skema", nilai: filterSchemaLabel },
      { keterangan: "Total Pendaftar", nilai: totalPendaftar },
      {
        keterangan: "Menunggu Verifikasi",
        nilai: statusCounts.menungguVerifikasi,
      },
      { keterangan: "Menunggu Validasi", nilai: statusCounts.menungguValidasi },
      { keterangan: "Divalidasi", nilai: statusCounts.divalidasi },
      { keterangan: "Perlu Revisi", nilai: statusCounts.perluRevisi },
      { keterangan: "Ditolak", nilai: statusCounts.ditolak },
    ];

    summaryRows.forEach((item, index) => {
      const row = summarySheet.addRow(item);
      applyDataRowStyle(row, index);
    });
    applyCenterAlignment(summarySheet, ["nilai"]);

    const applicantsSheet = workbook.addWorksheet("Data Pendaftar");
    applicantsSheet.columns = [
      { header: "No", key: "no", width: 8 },
      { header: "Nama", key: "nama", width: 25 },
      { header: "NIM", key: "nim", width: 18 },
      { header: "Fakultas", key: "fakultas", width: 25 },
      { header: "Departemen", key: "departemen", width: 25 },
      { header: "Program Studi", key: "prodi", width: 20 },
      { header: "Gender", key: "gender", width: 12 },
      { header: "Email", key: "email", width: 30 },
      { header: "Beasiswa", key: "beasiswa", width: 30 },
      { header: "Skema", key: "skema", width: 30 },
      { header: "Status", key: "status", width: 30 },
      { header: "Tanggal Daftar", key: "tanggalDaftar", width: 20 },
    ];
    applyHeaderStyle(applicantsSheet.getRow(1));

    applications.forEach((app, index) => {
      const row = applicantsSheet.addRow({
        no: index + 1,
        nama: app.student?.full_name || "N/A",
        nim: app.student?.nim || "N/A",
        fakultas:
          app.student?.study_program?.department?.faculty?.name || "N/A",
        departemen: app.student?.study_program?.department?.name || "N/A",
        prodi: app.student?.study_program?.degree || "N/A",
        gender: app.student?.gender === "L" ? "Laki-laki" : "Perempuan",
        email: app.student?.email || "-",
        beasiswa: app.schema?.scholarship?.name || "N/A",
        skema: app.schema?.name || "N/A",
        status: getStatusLabel(app.status),
        tanggalDaftar: app.createdAt
          ? new Date(app.createdAt).toLocaleDateString("id-ID")
          : "-",
      });
      applyDataRowStyle(row, index);
    });

    applyCenterAlignment(applicantsSheet, [
      "no",
      "nim",
      "gender",
      "tanggalDaftar",
    ]);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const yearLabel = year || "Semua";
    const fileName = `laporan_pendaftar_${yearLabel}_${timestamp}.xlsx`;
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
        console.error("Error sending export file:", err);
        if (!res.headersSent) {
          return errorResponse(res, "Gagal mengunduh laporan pendaftar", 500);
        }
      }

      setTimeout(() => {
        fs.unlink(filePath, () => {});
      }, 10000);
    });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "EXPORT_APPLICANTS_REPORT",
      entity_type: "Application",
      entity_id: req.user.id,
      description: `${userName} mengekspor laporan data pendaftar`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });
  } catch (error) {
    console.error("Error exporting laporan pendaftar:", error);
    if (!res.headersSent) {
      return errorResponse(res, "Gagal mengunduh laporan pendaftar", 500);
    }
  }
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const readCellValue = (cellValue) => {
  if (cellValue === null || cellValue === undefined) return "";

  if (typeof cellValue === "object") {
    if (cellValue.text) return String(cellValue.text).trim();
    if (cellValue.result !== undefined && cellValue.result !== null) {
      return String(cellValue.result).trim();
    }
    if (cellValue.richText && Array.isArray(cellValue.richText)) {
      return cellValue.richText
        .map((item) => item.text || "")
        .join("")
        .trim();
    }
  }

  return String(cellValue).trim();
};

const buildImportRowsFromWorksheet = (worksheet) => {
  const headerAliases = {
    nama: ["nama", "nama mahasiswa", "nama lengkap"],
    nim: ["nim"],
    fakultas: ["fakultas"],
    departemen: ["departemen", "jurusan"],
    prodi: ["prodi", "program studi", "study program"],
    email: ["email"],
  };

  let headerRowNumber = null;
  let headerMap = {};

  worksheet.eachRow((row, rowNumber) => {
    if (headerRowNumber) return;

    const rowValues = [];
    row.eachCell((cell) => {
      rowValues.push(normalizeText(readCellValue(cell.value)));
    });

    if (!rowValues.length) return;

    const hasNim = rowValues.includes("nim");
    const hasNama =
      rowValues.includes("nama") || rowValues.includes("nama mahasiswa");

    if (hasNim && hasNama) {
      headerRowNumber = rowNumber;
      const resolvedMap = {};

      row.eachCell((cell, colNumber) => {
        const cellText = normalizeText(readCellValue(cell.value));
        Object.entries(headerAliases).forEach(([key, aliases]) => {
          if (aliases.includes(cellText)) {
            resolvedMap[key] = colNumber;
          }
        });
      });

      headerMap = resolvedMap;
    }
  });

  if (!headerRowNumber) {
    throw new Error(
      "Header tidak ditemukan. Gunakan template import yang disediakan sistem.",
    );
  }

  const requiredColumns = ["nama", "nim"];
  const missingColumns = requiredColumns.filter((key) => !headerMap[key]);
  if (missingColumns.length) {
    throw new Error(
      `Kolom wajib tidak ditemukan: ${missingColumns.join(", ")}`,
    );
  }

  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowNumber) return;
    if (row.actualCellCount === 0) return;

    const record = {
      nama: readCellValue(row.getCell(headerMap.nama).value),
      nim: readCellValue(row.getCell(headerMap.nim).value),
      fakultas: headerMap.fakultas
        ? readCellValue(row.getCell(headerMap.fakultas).value)
        : "",
      departemen: headerMap.departemen
        ? readCellValue(row.getCell(headerMap.departemen).value)
        : "",
      prodi: headerMap.prodi
        ? readCellValue(row.getCell(headerMap.prodi).value)
        : "",
      email: headerMap.email
        ? readCellValue(row.getCell(headerMap.email).value)
        : "",
      excelRow: rowNumber,
    };

    if (
      !record.nama &&
      !record.nim &&
      !record.fakultas &&
      !record.departemen &&
      !record.prodi
    ) {
      return;
    }

    rows.push(record);
  });

  return rows;
};

const getOrCreateFaculty = async (name, cache, transaction) => {
  const normalized = normalizeText(name);
  if (!normalized) return null;
  if (cache.has(normalized)) return cache.get(normalized);

  let faculty = await Faculty.findOne({
    where: sequelize.where(
      sequelize.fn("LOWER", sequelize.col("name")),
      normalized,
    ),
    transaction,
  });

  if (!faculty) {
    const code = `FAC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 9999)}`;
    faculty = await Faculty.create(
      {
        name: String(name).trim(),
        code,
        is_active: true,
      },
      { transaction },
    );
  }

  cache.set(normalized, faculty);
  return faculty;
};

const getOrCreateDepartment = async (name, facultyId, cache, transaction) => {
  const normalized = normalizeText(name);
  if (!normalized || !facultyId) return null;

  const cacheKey = `${facultyId}:${normalized}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  let department = await Department.findOne({
    where: {
      faculty_id: facultyId,
      [Op.and]: sequelize.where(
        sequelize.fn("LOWER", sequelize.col("name")),
        normalized,
      ),
    },
    transaction,
  });

  if (!department) {
    const code = `DEP-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 9999)}`;
    department = await Department.create(
      {
        faculty_id: facultyId,
        name: String(name).trim(),
        code,
        is_active: true,
      },
      { transaction },
    );
  }

  cache.set(cacheKey, department);
  return department;
};

const getOrCreateStudyProgram = async (
  name,
  departmentId,
  cache,
  transaction,
) => {
  const normalized = normalizeText(name);
  if (!normalized || !departmentId) return null;

  const cacheKey = `${departmentId}:${normalized}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  let program = await StudyProgram.findOne({
    where: {
      department_id: departmentId,
      [Op.and]: sequelize.where(
        sequelize.fn("LOWER", sequelize.col("name")),
        normalized,
      ),
    },
    transaction,
  });

  if (!program) {
    const code = `PRODI-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 9999)}`;
    program = await StudyProgram.create(
      {
        department_id: departmentId,
        name: String(name).trim(),
        code,
        degree: "S1",
        is_active: true,
      },
      { transaction },
    );
  }

  cache.set(cacheKey, program);
  return program;
};

const ensureUserForImportedRecipient = async ({
  row,
  transaction,
  passwordHash,
  facultyCache,
  departmentCache,
  programCache,
}) => {
  let user = await User.findOne({
    where: { nim: row.nim },
    transaction,
  });

  if (!user && row.email) {
    user = await User.findOne({ where: { email: row.email }, transaction });
  }

  if (user) {
    return { user, isDummyCreated: false };
  }

  const faculty = await getOrCreateFaculty(
    row.fakultas,
    facultyCache,
    transaction,
  );
  const department = await getOrCreateDepartment(
    row.departemen,
    faculty?.id,
    departmentCache,
    transaction,
  );
  const program = await getOrCreateStudyProgram(
    row.prodi,
    department?.id,
    programCache,
    transaction,
  );

  const nimSafe = String(row.nim || "mahasiswa").replace(/[^a-zA-Z0-9]/g, "");
  const emailBase = `dummy.${nimSafe || Date.now()}@dummy.local`;

  let emailToUse = emailBase;
  let emailCounter = 1;
  while (await User.findOne({ where: { email: emailToUse }, transaction })) {
    emailToUse = `dummy.${nimSafe || Date.now()}.${emailCounter}@dummy.local`;
    emailCounter += 1;
  }

  user = await User.create(
    {
      email: emailToUse,
      password: passwordHash,
      full_name: row.nama,
      role: "MAHASISWA",
      nim: row.nim,
      faculty_id: faculty?.id || null,
      department_id: department?.id || null,
      study_program_id: program?.id || null,
      is_active: true,
      emailVerified: false,
    },
    { transaction },
  );

  return { user, isDummyCreated: true };
};

const downloadTemplateImportPenerima = async (req, res) => {
  try {
    const [faculties, departments, studyPrograms] = await Promise.all([
      Faculty.findAll({
        where: { is_active: true },
        attributes: ["name"],
        order: [["name", "ASC"]],
      }),
      Department.findAll({
        where: { is_active: true },
        attributes: ["name"],
        order: [["name", "ASC"]],
      }),
      StudyProgram.findAll({
        where: { is_active: true },
        attributes: ["name"],
        order: [["name", "ASC"]],
      }),
    ]);

    const workbook = new ExcelJS.Workbook();
    const templateSheet = workbook.addWorksheet("Template Import Penerima");
    const infoSheet = workbook.addWorksheet("Petunjuk");
    const referenceSheet = workbook.addWorksheet("Referensi");

    const facultyOptions = faculties.map((item) => item.name).filter(Boolean);
    const departmentOptions = departments
      .map((item) => item.name)
      .filter(Boolean);
    const studyProgramOptions = studyPrograms
      .map((item) => item.name)
      .filter(Boolean);

    const safeFacultyOptions =
      facultyOptions.length > 0 ? facultyOptions : ["Tidak ada data fakultas"];
    const safeDepartmentOptions =
      departmentOptions.length > 0
        ? departmentOptions
        : ["Tidak ada data departemen"];
    const safeStudyProgramOptions =
      studyProgramOptions.length > 0
        ? studyProgramOptions
        : ["Tidak ada data prodi"];

    referenceSheet.columns = [
      { header: "fakultas", key: "fakultas", width: 30 },
      { header: "departemen", key: "departemen", width: 30 },
      { header: "prodi", key: "prodi", width: 30 },
    ];

    const maxRefRows = Math.max(
      safeFacultyOptions.length,
      safeDepartmentOptions.length,
      safeStudyProgramOptions.length,
    );

    for (let i = 0; i < maxRefRows; i += 1) {
      referenceSheet.addRow({
        fakultas: safeFacultyOptions[i] || null,
        departemen: safeDepartmentOptions[i] || null,
        prodi: safeStudyProgramOptions[i] || null,
      });
    }

    referenceSheet.state = "hidden";

    templateSheet.columns = [
      { header: "nama", key: "nama", width: 30 },
      { header: "nim", key: "nim", width: 18 },
      { header: "fakultas", key: "fakultas", width: 25 },
      { header: "departemen", key: "departemen", width: 25 },
      { header: "prodi", key: "prodi", width: 25 },
      { header: "email", key: "email", width: 30 },
    ];

    applyHeaderStyle(templateSheet.getRow(1));

    const dropdownEndRow = 1000;
    const facultyEndRow = safeFacultyOptions.length + 1;
    const departmentEndRow = safeDepartmentOptions.length + 1;
    const studyProgramEndRow = safeStudyProgramOptions.length + 1;

    for (let rowNumber = 2; rowNumber <= dropdownEndRow; rowNumber += 1) {
      templateSheet.getCell(`C${rowNumber}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`Referensi!$A$2:$A$${facultyEndRow}`],
        showErrorMessage: true,
        errorTitle: "Pilihan tidak valid",
        error: "Pilih fakultas dari dropdown.",
      };

      templateSheet.getCell(`D${rowNumber}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`Referensi!$B$2:$B$${departmentEndRow}`],
        showErrorMessage: true,
        errorTitle: "Pilihan tidak valid",
        error: "Pilih departemen dari dropdown.",
      };

      templateSheet.getCell(`E${rowNumber}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`Referensi!$C$2:$C$${studyProgramEndRow}`],
        showErrorMessage: true,
        errorTitle: "Pilihan tidak valid",
        error: "Pilih program studi dari dropdown.",
      };
    }

    infoSheet.columns = [{ header: "Petunjuk", key: "petunjuk", width: 120 }];
    applyHeaderStyle(infoSheet.getRow(1));
    [
      "Kolom wajib: nama dan nim.",
      "Kolom fakultas, departemen, dan prodi memiliki dropdown berdasarkan data aktif di database.",
      "Nama beasiswa dipilih saat proses import di dalam modal.",
      "Sistem akan menggunakan skema aktif pertama dari beasiswa yang dipilih.",
      "Sistem akan mencocokkan user berdasarkan NIM (prioritas) lalu email.",
      "Jika user tidak ditemukan, sistem akan membuat akun dummy mahasiswa secara otomatis.",
      "Password akun dummy default: dummy12345 (bisa diubah kemudian oleh admin).",
    ].forEach((text, index) => {
      const row = infoSheet.addRow({ petunjuk: text });
      applyDataRowStyle(row, index);
    });

    const fileName = "template_import_penerima_beasiswa.xlsx";
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=\"${fileName}\"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error downloading import template:", error);
    return errorResponse(res, "Gagal mengunduh template import", 500);
  }
};

const validateImportPenerimaBeasiswa = async (req, res) => {
  const filePath = req.file?.path ?? null;

  try {
    const { scholarshipId } = req.body;

    if (!req.file) {
      return errorResponse(res, "File Excel wajib diupload", 400);
    }

    if (!scholarshipId) {
      return errorResponse(res, "Pilih beasiswa terlebih dahulu", 400);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error("Worksheet tidak ditemukan");
    }

    const rows = buildImportRowsFromWorksheet(worksheet);

    if (!rows.length) {
      throw new Error("Tidak ada data yang dapat diproses");
    }

    const selectedScholarship = await Scholarship.findByPk(scholarshipId, {
      attributes: ["id", "name", "year"],
      include: [
        {
          model: ScholarshipSchema,
          as: "schemas",
          attributes: ["id", "name", "is_active"],
          required: false,
        },
      ],
    });

    if (!selectedScholarship) {
      return errorResponse(res, "Beasiswa tidak ditemukan", 404);
    }

    const selectedSchema =
      (selectedScholarship.schemas || []).find((schema) => schema.is_active) ||
      (selectedScholarship.schemas || [])[0] ||
      null;

    if (!selectedSchema) {
      return errorResponse(
        res,
        "Beasiswa terpilih belum memiliki skema aktif untuk import",
        400,
      );
    }

    const errors = [];
    const preview = [];

    for (const row of rows) {
      if (!row.nama) {
        errors.push({
          row: row.excelRow,
          field: "nama",
          message: "Nama wajib diisi",
        });
        continue;
      }
      if (!row.nim) {
        errors.push({
          row: row.excelRow,
          field: "nim",
          message: "NIM wajib diisi",
        });
        continue;
      }

      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { nim: row.nim },
            ...(row.email ? [{ email: row.email }] : []),
          ],
        },
        attributes: ["id", "full_name", "nim", "email"],
      });

      preview.push({
        nim: row.nim,
        nama: row.nama,
        fakultas: row.fakultas || "-",
        departemen: row.departemen || "-",
        prodi: row.prodi || "-",
        beasiswa: selectedScholarship.name,
        skema: selectedSchema.name,
        tahun: selectedScholarship.year,
        userStatus: existingUser ? "MATCHED" : "DUMMY_AKAN_DIBUAT",
      });
    }

    return successResponse(res, "Validasi import penerima berhasil", {
      total_rows: rows.length,
      valid_count: preview.length,
      error_count: errors.length,
      errors: errors.slice(0, 30),
      preview: preview.slice(0, 20),
    });
  } catch (error) {
    console.error("Error validating recipient import:", error);
    return errorResponse(
      res,
      error.message || "Gagal memvalidasi file import",
      500,
    );
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};

const importPenerimaBeasiswa = async (req, res) => {
  const transaction = await sequelize.transaction();
  const filePath = req.file?.path ?? null;

  try {
    const { scholarshipId } = req.body;

    if (!req.file) {
      return errorResponse(res, "File Excel wajib diupload", 400);
    }

    if (!scholarshipId) {
      return errorResponse(res, "Pilih beasiswa terlebih dahulu", 400);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error("Worksheet tidak ditemukan");
    }

    const rows = buildImportRowsFromWorksheet(worksheet);
    if (!rows.length) {
      throw new Error("Tidak ada data yang dapat diproses");
    }

    const selectedScholarship = await Scholarship.findByPk(scholarshipId, {
      attributes: ["id", "name", "year"],
      include: [
        {
          model: ScholarshipSchema,
          as: "schemas",
          attributes: ["id", "name", "is_active"],
          required: false,
        },
      ],
      transaction,
    });

    if (!selectedScholarship) {
      await transaction.rollback();
      return errorResponse(res, "Beasiswa tidak ditemukan", 404);
    }

    const selectedSchema =
      (selectedScholarship.schemas || []).find((schema) => schema.is_active) ||
      (selectedScholarship.schemas || [])[0] ||
      null;

    if (!selectedSchema) {
      await transaction.rollback();
      return errorResponse(
        res,
        "Beasiswa terpilih belum memiliki skema aktif untuk import",
        400,
      );
    }

    const facultyCache = new Map();
    const departmentCache = new Map();
    const programCache = new Map();
    const dummyPasswordHash = await bcrypt.hash("dummy12345", 10);

    let createdApplications = 0;
    let updatedApplications = 0;
    let matchedUsers = 0;
    let createdDummyUsers = 0;
    const errors = [];

    for (const row of rows) {
      if (!row.nama || !row.nim) {
        errors.push(`Baris ${row.excelRow}: kolom nama dan nim wajib diisi`);
        continue;
      }

      const { user, isDummyCreated } = await ensureUserForImportedRecipient({
        row,
        transaction,
        passwordHash: dummyPasswordHash,
        facultyCache,
        departmentCache,
        programCache,
      });

      if (isDummyCreated) createdDummyUsers += 1;
      else matchedUsers += 1;

      const importYear = selectedScholarship.year || new Date().getFullYear();

      const importDate = new Date(`${importYear}-01-01T00:00:00.000Z`);

      const existingApplication = await Application.findOne({
        where: {
          student_id: user.id,
          schema_id: selectedSchema.id,
        },
        transaction,
      });

      if (existingApplication) {
        await existingApplication.update(
          {
            status: "VALIDATED",
            submitted_at: existingApplication.submitted_at || importDate,
            validated_by: req.user?.id || null,
            validated_at: new Date(),
          },
          { transaction },
        );
        updatedApplications += 1;
      } else {
        await Application.create(
          {
            schema_id: selectedSchema.id,
            student_id: user.id,
            status: "VALIDATED",
            submitted_at: importDate,
            validated_by: req.user?.id || null,
            validated_at: new Date(),
            createdAt: importDate,
            updatedAt: new Date(),
          },
          { transaction },
        );
        createdApplications += 1;
      }
    }

    if (errors.length > 0) {
      await transaction.rollback();
      return errorResponse(
        res,
        `Ditemukan ${errors.length} error:\n${errors
          .slice(0, 10)
          .join(
            "\n",
          )}${errors.length > 10 ? `\n... dan ${errors.length - 10} error lainnya` : ""}`,
        400,
      );
    }

    await transaction.commit();

    await ActivityLog.create({
      user_id: req.user.id,
      action: "IMPORT_SCHOLARSHIP_RECIPIENTS",
      entity_type: "Application",
      entity_id: req.user.id,
      description: `${req.user.full_name || "User"} mengimpor data penerima untuk ${selectedScholarship.name} (${createdApplications} baru, ${updatedApplications} diperbarui)`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    try {
      await Promise.all([
        invalidateApplicationCaches(),
        invalidateCacheByPattern("applications_summary:*"),
      ]);
    } catch (cacheError) {
      console.error(
        "Error invalidating caches after recipient import:",
        cacheError,
      );
    }

    return successResponse(res, "Import data penerima berhasil", {
      total_processed: rows.length,
      created_applications: createdApplications,
      updated_applications: updatedApplications,
      matched_users: matchedUsers,
      created_dummy_users: createdDummyUsers,
      dummy_password_default: "dummy12345",
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error("Error importing scholarship recipients:", error);
    return errorResponse(
      res,
      error.message || "Gagal mengimpor data penerima",
      500,
    );
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};

module.exports = {
  exportLaporanBeasiswa,
  exportPendaftarLaporan,
  downloadTemplateImportPenerima,
  validateImportPenerimaBeasiswa,
  importPenerimaBeasiswa,
};
