const {
  Application,
  User,
  Scholarship,
  Faculty,
  Department,
  ActivityLog,
  sequelize,
} = require("../models");
const { successResponse, errorResponse } = require("../utils/response");
const { Op } = require("sequelize");

const getSummary = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const currentYear = new Date().getFullYear();

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
        scholarship_status: "AKTIF",
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

    const summary = {
      totalPendaftar,
      totalBeasiswa,
      beasiswaMasihBuka,
      beasiswaSudahTutup,
      totalMahasiswa,
    };

    return successResponse(res, "Summary retrieved successfully", summary);
  } catch (error) {
    console.error("Error fetching summary:", error);
    return errorResponse(res, "Failed to retrieve summary", 500);
  }
};

// Selection Summary Data
const getSelectionSummary = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

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

    const summary = {
      lolosSeleksiBerkas,
      menungguVerifikasi,
      menungguValidasi,
      tidakLolosSeleksi,
    };

    return successResponse(
      res,
      "Selection summary retrieved successfully",
      summary
    );
  } catch (error) {
    console.error("Error fetching selection summary:", error);
    return errorResponse(res, "Failed to retrieve selection summary", 500);
  }
};

const getFacultyDistribution = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const facultyData = await sequelize.query(
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

    return successResponse(
      res,
      "Faculty distribution retrieved successfully",
      facultyData
    );
  } catch (error) {
    console.error("Error fetching faculty distribution:", error);
    return errorResponse(res, "Failed to retrieve faculty distribution", 500);
  }
};

const getDepartmentDistribution = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const departmentData = await sequelize.query(
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

    return successResponse(
      res,
      "Department distribution retrieved successfully",
      departmentData
    );
  } catch (error) {
    console.error("Error fetching department distribution:", error);
    return errorResponse(
      res,
      "Failed to retrieve department distribution",
      500
    );
  }
};

const getYearlyTrend = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);

    const yearlyData = await Promise.all(
      years.map(async (year) => {
        const count = await Application.count({
          where: {
            status: { [Op.ne]: "DRAFT" },
            createdAt: {
              [Op.gte]: new Date(`${year}-01-01`),
              [Op.lte]: new Date(`${year}-12-31`),
            },
          },
        });
        return { label: year.toString(), value: count };
      })
    );

    return successResponse(
      res,
      "Yearly trend retrieved successfully",
      yearlyData
    );
  } catch (error) {
    console.error("Error fetching yearly trend:", error);
    return errorResponse(res, "Failed to retrieve yearly trend", 500);
  }
};

const getGenderDistribution = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

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

    const transformedData = genderData.map((item) => ({
      ...item,
      label: item.label === "L" ? "Laki-laki" : "Perempuan",
    }));

    return successResponse(
      res,
      "Gender distribution retrieved successfully",
      transformedData
    );
  } catch (error) {
    console.error("Error fetching gender distribution:", error);
    return errorResponse(res, "Failed to retrieve gender distribution", 500);
  }
};

const getStatusSummary = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const [menungguVerifikasi, menungguValidasi, disetujui, ditolak] =
      await Promise.all([
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
            status: "VALIDATED",
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

    const statusSummary = [
      {
        label: "Menunggu Verifikasi",
        value: menungguVerifikasi,
        color: "#FF8C42",
      },
      {
        label: "Menunggu Validasi",
        value: menungguValidasi,
        color: "#FFD23F",
      },
      {
        label: "Disetujui",
        value: disetujui,
        color: "#06D6A0",
      },
      {
        label: "Ditolak",
        value: ditolak,
        color: "#EF476F",
      },
    ];

    return successResponse(
      res,
      "Status summary retrieved successfully",
      statusSummary
    );
  } catch (error) {
    console.error("Error fetching status summary:", error);
    return errorResponse(res, "Failed to retrieve status summary", 500);
  }
};

const getActivities = async (req, res) => {
  try {
    const recentActivityLogs = await ActivityLog.findAll({
      where: {
        createdAt: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      include: [
        {
          model: User,
          attributes: ["full_name", "role"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 15,
    });

    const activities = [];

    recentActivityLogs.forEach((log) => {
      const timeAgo = getTimeAgo(log.createdAt);

      let type = "SISTEM";
      let description = log.description;

      if (log.action.includes("CREATE") || log.action.includes("REGISTER")) {
        if (log.entity_type === "APPLICATION") {
          type = "PENDAFTARAN";
        } else if (log.entity_type === "SCHOLARSHIP") {
          type = "BEASISWA";
        } else if (log.entity_type === "USER") {
          type = "PENGGUNA";
        }
      } else if (
        log.action.includes("UPDATE") ||
        log.action.includes("VERIFY")
      ) {
        if (log.entity_type === "APPLICATION") {
          type = "VERIFIKASI";
        } else if (log.entity_type === "SCHOLARSHIP") {
          type = "BEASISWA";
        }
      } else if (log.action.includes("DELETE")) {
        type = "PENGHAPUSAN";
      } else if (log.action.includes("LOGIN")) {
        type = "LOGIN";
      }

      if (!description) {
        const userName = log.User?.full_name || "Sistem";
        description = `${userName} melakukan ${log.action.toLowerCase()}`;
      }

      activities.push({
        type: type,
        desc: description,
        time: timeAgo,
        timestamp: log.createdAt,
        user: log.User?.full_name || null,
        action: log.action,
      });
    });

    const recentActivities = activities.slice(0, 8);

    return successResponse(
      res,
      "Activities retrieved successfully",
      recentActivities
    );
  } catch (error) {
    console.error("Error fetching activities:", error);
    return errorResponse(res, "Failed to retrieve activities", 500);
  }
};

const getApplicationsList = async (req, res) => {
  try {
    const {
      year = new Date().getFullYear(),
      fakultas,
      departemen,
      gender,
      search,
    } = req.query;

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

    const transformedApplications = applications.map((app) => ({
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

    return successResponse(
      res,
      "Applications list retrieved successfully",
      transformedApplications
    );
  } catch (error) {
    console.error("Error fetching applications list:", error);
    return errorResponse(res, "Failed to retrieve applications list", 500);
  }
};

const getTimeAgo = (date) => {
  const now = new Date();
  const diffInMs = now - new Date(date);
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

  if (diffInMinutes < 1) {
    return "Baru saja";
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} menit lalu`;
  } else if (diffInHours < 24) {
    return `${diffInHours} jam lalu`;
  } else {
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    return `${diffInDays} hari lalu`;
  }
};

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

module.exports = {
  getSummary,
  getSelectionSummary,
  getFacultyDistribution,
  getDepartmentDistribution,
  getYearlyTrend,
  getGenderDistribution,
  getStatusSummary,
  getActivities,
  getApplicationsList,
};
