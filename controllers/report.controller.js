const {
  Application,
  User,
  Scholarship,
  Faculty,
  Department,
  ActivityLog,
  sequelize,
} = require("../models");
const { errorResponse } = require("../utils/response");
const { Op } = require("sequelize");
const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

const getStatusLabel = (status) => {
  const statusMap = {
    MENUNGGU_VERIFIKASI: "Menunggu Verifikasi",
    VERIFIED: "Terverifikasi",
    MENUNGGU_VALIDASI: "Menunggu Validasi",
    REJECTED: "Ditolak",
    VALIDATED: "Disetujui",
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

  const beasiswaSudahTutup = totalBeasiswa - beasiswaMasihBuka;

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
    menungguValidasi,
    tidakLolosSeleksi,
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
        status: "MENUNGGU_VALIDASI",
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
  ]);

  return {
    lolosSeleksiBerkas,
    menungguVerifikasi,
    menungguValidasi,
    tidakLolosSeleksi,
  };
};

const getApplicationsListData = async (filters) => {
  const {
    year = new Date().getFullYear(),
    fakultas,
    departemen,
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
  let departmentWhereCondition = {};
  let facultyWhereCondition = {};

  if (gender && gender !== "Semua") {
    userWhereCondition.gender = gender === "Laki-laki" ? "L" : "P";
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
      {
        model: Scholarship,
        as: "scholarship",
        attributes: ["id", "name"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  return applications.map((app) => ({
    id: app.id,
    nama: app.student?.full_name || "N/A",
    nim: app.student?.nim || "N/A",
    fakultas: app.student?.department?.faculty?.name || "N/A",
    departemen: app.student?.department?.name || "N/A",
    gender: app.student?.gender === "L" ? "Laki-laki" : "Perempuan",
    status: getStatusLabel(app.status),
    beasiswa: app.scholarship?.name || "N/A",
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
    }
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
    }
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
    }
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
    }
  );

  return genderData.map((item) => ({
    ...item,
    label: item.label === "L" ? "Laki-laki" : "Perempuan",
  }));
};

const getScholarshipPerformanceData = async (year) => {
  return await sequelize.query(
    `
    SELECT 
      s.name as label,
      COUNT(a.id) as pendaftar,
      COUNT(CASE WHEN a.status = 'VALIDATED' THEN 1 END) as diterima,
      ROUND(
        (COUNT(CASE WHEN a.status = 'VALIDATED' THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0)),
        1
      ) as tingkat_penerimaan
    FROM scholarships s
    LEFT JOIN applications a ON s.id = a.scholarship_id 
      AND a.status != 'DRAFT'
      AND YEAR(a.createdAt) = :year
    WHERE s.year = :year AND s.is_active = true
    GROUP BY s.id, s.name
    HAVING COUNT(a.id) > 0
    ORDER BY pendaftar DESC
    LIMIT 10
    `,
    {
      replacements: { year },
      type: sequelize.QueryTypes.SELECT,
    }
  );
};

const getTopPerformingFacultiesData = async (year) => {
  return await sequelize.query(
    `
    SELECT 
      f.name as label,
      COUNT(a.id) as total_pendaftar,
      COUNT(CASE WHEN a.status = 'VALIDATED' THEN 1 END) as diterima,
      ROUND(
        (COUNT(CASE WHEN a.status = 'VALIDATED' THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0)),
        1
      ) as tingkat_keberhasilan,
      '#2D60FF' as color
    FROM faculties f
    LEFT JOIN departments d ON f.id = d.faculty_id
    LEFT JOIN users u ON u.department_id = d.id AND u.role = 'MAHASISWA'
    LEFT JOIN applications a ON u.id = a.student_id 
      AND a.status != 'DRAFT'
      AND YEAR(a.createdAt) = :year
    WHERE f.is_active = true
    GROUP BY f.id, f.name
    HAVING COUNT(a.id) >= 5
    ORDER BY tingkat_keberhasilan DESC, total_pendaftar DESC
    LIMIT 5
    `,
    {
      replacements: { year },
      type: sequelize.QueryTypes.SELECT,
    }
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
      genderData,
      beasiswaData,
      fakultasTerbaikData,
    ] = await Promise.all([
      getSummaryData(year),
      getSelectionSummaryData(year),
      getApplicationsListData({ year }),
      getMonthlyTrendData(year),
      getFacultyDistributionData(year),
      getDepartmentDistributionData(year),
      getGenderDistributionData(year),
      getScholarshipPerformanceData(year),
      getTopPerformingFacultiesData(year),
    ]);

    const workbook = new ExcelJS.Workbook();

    const summarySheet = workbook.addWorksheet("Ringkasan");
    summarySheet.addRows([
      ["Keterangan", "Nilai"],
      ["Jumlah Pendaftar", mainSummary.totalPendaftar],
      ["Jumlah Beasiswa", mainSummary.totalBeasiswa],
      ["Beasiswa Masih Buka", mainSummary.beasiswaMasihBuka],
      ["Beasiswa Sudah Tutup", mainSummary.beasiswaSudahTutup],
      ["Total Mahasiswa", mainSummary.totalMahasiswa],
    ]);

    const selectionSheet = workbook.addWorksheet("Ringkasan Seleksi");
    selectionSheet.addRows([
      ["Keterangan", "Nilai"],
      ["Jumlah Mahasiswa Diterima", selectionSummary.lolosSeleksiBerkas],
      ["Menunggu Verifikasi", selectionSummary.menungguVerifikasi],
      ["Menunggu Validasi", selectionSummary.menungguValidasi],
      ["Tidak Lolos Seleksi", selectionSummary.tidakLolosSeleksi],
    ]);

    const pendaftarSheet = workbook.addWorksheet("Data Pendaftar");
    pendaftarSheet.columns = [
      { header: "Nama", key: "nama", width: 25 },
      { header: "NIM", key: "nim", width: 18 },
      { header: "Fakultas", key: "fakultas", width: 20 },
      { header: "Departemen", key: "departemen", width: 20 },
      { header: "Gender", key: "gender", width: 12 },
      { header: "Status", key: "status", width: 20 },
      { header: "Beasiswa", key: "beasiswa", width: 25 },
      { header: "Tanggal Daftar", key: "tanggalDaftar", width: 22 },
    ];
    pendaftar.forEach((row) => pendaftarSheet.addRow(row));

    const monthlySheet = workbook.addWorksheet("Tren Bulanan");
    monthlySheet.addRows([
      ["Bulan", "Jumlah Pendaftar"],
      ...monthlyData.map((item) => [item.label, item.value]),
    ]);

    const fakultasSheet = workbook.addWorksheet("Fakultas");
    fakultasSheet.addRows([
      ["Fakultas", "Jumlah Pendaftar"],
      ...fakultasData.map((item) => [item.label, item.value]),
    ]);

    const departemenSheet = workbook.addWorksheet("Departemen");
    departemenSheet.addRows([
      ["Departemen", "Jumlah Pendaftar"],
      ...departemenData.map((item) => [item.label, item.value]),
    ]);

    const genderSheet = workbook.addWorksheet("Gender");
    genderSheet.addRows([
      ["Gender", "Jumlah Pendaftar"],
      ...genderData.map((item) => [item.label, item.value]),
    ]);

    const beasiswaSheet = workbook.addWorksheet("Performa Beasiswa");
    beasiswaSheet.addRows([
      ["Beasiswa", "Pendaftar", "Diterima", "Tingkat Penerimaan (%)"],
      ...beasiswaData.map((item) => [
        item.label,
        item.pendaftar,
        item.diterima,
        item.tingkat_penerimaan,
      ]),
    ]);

    const fakultasTerbaikSheet = workbook.addWorksheet("Fakultas Terbaik");
    fakultasTerbaikSheet.addRows([
      ["Fakultas", "Total Pendaftar", "Diterima", "Tingkat Keberhasilan (%)"],
      ...fakultasTerbaikData.map((item) => [
        item.label,
        item.total_pendaftar,
        item.diterima,
        item.tingkat_keberhasilan,
      ]),
    ]);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `laporan_beasiswa_${year}_${timestamp}.xlsx`;
    const tempDir = path.join(__dirname, "../uploads/exports");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, fileName);

    await workbook.xlsx.writeFile(filePath);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
  } catch (error) {
    console.error("Error exporting laporan beasiswa:", error);
    if (!res.headersSent) {
      return errorResponse(res, "Gagal mengunduh laporan", 500);
    }
  }

  const userName = req.user.full_name || "User";
  await ActivityLog.create({
    user_id: req.user.id,
    action: "EXPORT_REPORT",
    entity_type: "Application",
    entity_id: req.user.id,
    description: `${userName} mengekspor laporan beasiswa`,
    ip_address: req.ip,
    user_agent: req.headers["user-agent"],
  });
};

module.exports = {
  exportLaporanBeasiswa,
};
