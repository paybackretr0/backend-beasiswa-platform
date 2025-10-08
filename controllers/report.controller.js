const {
  Application,
  User,
  Scholarship,
  Faculty,
  Department,
  sequelize,
} = require("../models");
const { successResponse, errorResponse } = require("../utils/response");
const { Op } = require("sequelize");

const getMainSummary = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

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

    const summary = {
      totalPendaftar,
      totalBeasiswa,
      beasiswaMasihBuka,
      beasiswaSudahTutup,
    };

    return successResponse(res, "Main summary retrieved successfully", summary);
  } catch (error) {
    console.error("Error fetching main summary:", error);
    return errorResponse(res, "Failed to retrieve main summary", 500);
  }
};

const getSelectionSummary = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const lolosSeleksiBerkas = await Application.count({
      where: {
        status: "VALIDATED",
        createdAt: {
          [Op.gte]: new Date(`${year}-01-01`),
          [Op.lte]: new Date(`${year}-12-31`),
        },
      },
    });

    const menungguVerifikasi = await Application.count({
      where: {
        status: "MENUNGGU_VERIFIKASI",
        createdAt: {
          [Op.gte]: new Date(`${year}-01-01`),
          [Op.lte]: new Date(`${year}-12-31`),
        },
      },
    });

    const menungguValidasi = await Application.count({
      where: {
        status: "MENUNGGU_VALIDASI",
        createdAt: {
          [Op.gte]: new Date(`${year}-01-01`),
          [Op.lte]: new Date(`${year}-12-31`),
        },
      },
    });

    const tidakLolosSeleksi = await Application.count({
      where: {
        status: "REJECTED",
        createdAt: {
          [Op.gte]: new Date(`${year}-01-01`),
          [Op.lte]: new Date(`${year}-12-31`),
        },
      },
    });

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
      LEFT JOIN users u ON u.department_id = d.id
      LEFT JOIN applications a ON u.id = a.student_id 
        AND a.status != 'DRAFT'
        AND YEAR(a.createdAt) = :year
      GROUP BY f.id, f.name
      ORDER BY value DESC
      LIMIT 5
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
      LEFT JOIN users u ON u.department_id = d.id
      LEFT JOIN applications a ON u.id = a.student_id 
        AND a.status != 'DRAFT'
        AND YEAR(a.createdAt) = :year
      GROUP BY d.id, d.name
      ORDER BY value DESC
      LIMIT 5
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
      WHERE u.role = 'mahasiswa' AND a.id IS NOT NULL
      GROUP BY u.gender
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

    let userWhereCondition = {};
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
              attributes: ["id", "name"],
              include: [
                {
                  model: Faculty,
                  as: "faculty",
                  where: Object.keys(facultyWhereCondition).length
                    ? facultyWhereCondition
                    : undefined,
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
  getMainSummary,
  getSelectionSummary,
  getFacultyDistribution,
  getDepartmentDistribution,
  getYearlyTrend,
  getGenderDistribution,
  getApplicationsList,
};
