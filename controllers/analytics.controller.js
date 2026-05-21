const {
  Application,
  User,
  Student,
  StudyProgram,
  Scholarship,
  ScholarshipSchema,
  Faculty,
  Department,
  ActivityLog,
  sequelize,
} = require("../models");
const { successResponse, errorResponse } = require("../utils/response");
const { Op } = require("sequelize");
const { getOrSetCache } = require("../utils/cacheHelper");

const getUserFacultyFilter = (req) => {
  const user = req.user;
  const role = user?.role;
  const facultyId = user?.staff?.faculty_id || user?.faculty_id;

  if (role === "VERIFIKATOR_FAKULTAS" && facultyId) {
    return {
      facultyId,
      isFiltered: true,
      role: "VERIFIKATOR_FAKULTAS",
    };
  }

  if (role === "PIMPINAN_FAKULTAS" && facultyId) {
    return {
      facultyId,
      isFiltered: true,
      role: "PIMPINAN_FAKULTAS",
    };
  }

  return {
    facultyId: null,
    isFiltered: false,
    role,
  };
};

const getSummary = async (req, res) => {
  try {
    const { year } = req.query;
    const { facultyId, isFiltered, role } = getUserFacultyFilter(req);

    const cacheKey = `summary:${year || "all"}:${role}:${facultyId || "all"}`;

    const summary = await getOrSetCache(cacheKey, 300, async () => {
      let applicationFilter = {
        status: { [Op.ne]: "DRAFT" },
      };

      if (year && year !== "all") {
        applicationFilter.createdAt = {
          [Op.gte]: new Date(`${year}-01-01`),
          [Op.lte]: new Date(`${year}-12-31`),
        };
      }

      let scholarshipFilter = {};
      if (year && year !== "all") {
        scholarshipFilter.year = year;
      }

      let mahasiswaInclude = [
        {
          model: User,
          as: "user",
          attributes: [],
          where: {
            role: "MAHASISWA",
            is_active: true,
          },
          required: true,
        },
      ];

      if (isFiltered && facultyId) {
        mahasiswaInclude.push({
          model: StudyProgram,
          as: "study_program",
          attributes: [],
          required: true,
          include: [
            {
              model: Department,
              as: "department",
              attributes: [],
              required: true,
              where: { faculty_id: facultyId },
            },
          ],
        });
      }

      const [
        totalPendaftar,
        totalBeasiswa,
        beasiswaMasihBuka,
        totalMahasiswa,
        beasiswaSudahTutup,
      ] = await Promise.all([
        isFiltered
          ? Application.count({
              where: applicationFilter,
              include: [
                {
                  model: Student,
                  as: "student",
                  attributes: [],
                  required: true,
                  include: [
                    {
                      model: StudyProgram,
                      as: "study_program",
                      attributes: [],
                      required: true,
                      include: [
                        {
                          model: Department,
                          as: "department",
                          attributes: [],
                          required: true,
                          where: { faculty_id: facultyId },
                        },
                      ],
                    },
                  ],
                },
              ],
            })
          : Application.count({ where: applicationFilter }),

        Scholarship.count({ where: scholarshipFilter }),

        Scholarship.count({
          where: {
            ...scholarshipFilter,
            is_active: true,
            end_date: { [Op.gte]: new Date() },
          },
        }),

        Student.count({
          include: mahasiswaInclude,
          distinct: true,
        }),

        Scholarship.count({
          where: {
            ...scholarshipFilter,
            end_date: { [Op.lt]: new Date() },
          },
        }),
      ]);

      return {
        totalPendaftar,
        totalBeasiswa,
        beasiswaMasihBuka,
        beasiswaSudahTutup: beasiswaSudahTutup > 0 ? beasiswaSudahTutup : 0,
        totalMahasiswa,
      };
    });

    return successResponse(res, "Summary retrieved successfully", summary);
  } catch (error) {
    console.error("Error fetching summary:", error);
    return errorResponse(res, "Failed to retrieve summary", 500);
  }
};

const getMonthlyTrend = async (req, res) => {
  try {
    const { year } = req.query;
    const { facultyId, isFiltered, role } = getUserFacultyFilter(req);

    const cacheKey = `monthly_trend:${year || "all"}:${role}:${facultyId || "all"}`;

    const result = await getOrSetCache(cacheKey, 600, async () => {
      let query = `
        SELECT 
          MONTH(a.createdAt) as month,
          COUNT(*) as value
        FROM applications a
        INNER JOIN scholarship_schemas ss ON a.schema_id = ss.id
        INNER JOIN scholarships s ON ss.scholarship_id = s.id
      `;

      let whereClause = `WHERE a.status != 'DRAFT'`;
      let replacements = {};

      if (year && year !== "all") {
        whereClause += ` AND YEAR(a.createdAt) = :year`;
        replacements.year = year;
      }

      if (isFiltered) {
        query += `
          INNER JOIN students st ON a.student_id = st.id
          INNER JOIN study_programs sp ON st.study_program_id = sp.id
          INNER JOIN departments d ON sp.department_id = d.id
        `;
        whereClause += " AND d.faculty_id = :facultyId";
        replacements.facultyId = facultyId;
      }

      query += ` ${whereClause} GROUP BY MONTH(a.createdAt) ORDER BY month`;

      const monthlyData = await sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });

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
        const data = monthlyData.find((i) => i.month === index + 1);
        return { label: month, value: data ? parseInt(data.value) : 0 };
      });
    });

    return successResponse(res, "Monthly trend retrieved successfully", result);
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Failed to retrieve monthly trend", 500);
  }
};

const getScholarshipPerformance = async (req, res) => {
  try {
    const { year } = req.query;
    const { facultyId, isFiltered, role } = getUserFacultyFilter(req);

    const cacheKey = `scholarship_performance:${year || "all"}:${role}:${facultyId || "all"}`;

    const scholarshipData = await getOrSetCache(cacheKey, 600, async () => {
      let replacements = {};
      let yearCondition = "";
      let scholarshipYearFilter = "";

      if (year && year !== "all") {
        yearCondition = "AND YEAR(a.createdAt) = :year";
        scholarshipYearFilter = "AND s.year = :year";
        replacements.year = year;
      }

      let query = `
        SELECT 
          s.name as label,
          COUNT(a.id) as pendaftar,
          COUNT(CASE WHEN a.status = 'AWARDEE' THEN 1 END) as diterima,
          ROUND(
            (COUNT(CASE WHEN a.status = 'AWARDEE' THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0)),
            1
          ) as tingkat_penerimaan
        FROM scholarships s
        LEFT JOIN scholarship_schemas ss ON s.id = ss.scholarship_id
        LEFT JOIN applications a ON ss.id = a.schema_id
          AND a.status != 'DRAFT'
          ${yearCondition}
      `;

      if (isFiltered) {
        query += `
          LEFT JOIN students st ON a.student_id = st.id
          LEFT JOIN study_programs sp ON st.study_program_id = sp.id
          LEFT JOIN departments d ON sp.department_id = d.id
        `;
      }

      let whereClause = `
        WHERE s.is_active = true ${scholarshipYearFilter}
      `;

      if (isFiltered) {
        whereClause += ` AND (a.id IS NULL OR d.faculty_id = :facultyId) `;
        replacements.facultyId = facultyId;
      }

      query += `
        ${whereClause}
        GROUP BY s.id, s.name
        HAVING COUNT(a.id) > 0
        ORDER BY pendaftar DESC
        LIMIT 5
      `;

      const result = await sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });

      return result;
    });

    return successResponse(
      res,
      "Scholarship performance retrieved successfully",
      scholarshipData,
    );
  } catch (error) {
    console.error("Error fetching scholarship performance:", error);
    return errorResponse(
      res,
      "Failed to retrieve scholarship performance",
      500,
    );
  }
};

const getTopPerformingFaculties = async (req, res) => {
  try {
    const { year } = req.query;
    const { facultyId, isFiltered, role } = getUserFacultyFilter(req);

    const cacheKey = `top_performing_faculties:${year || "all"}:${role}:${facultyId || "all"}`;

    const facultyPerformance = await getOrSetCache(cacheKey, 600, async () => {
      let facultyWhere = "f.is_active = true";
      let replacements = {};

      if (isFiltered) {
        facultyWhere += " AND f.id = :facultyId";
        replacements.facultyId = facultyId;
      }

      let yearCondition = "";
      if (year && year !== "all") {
        yearCondition = " AND YEAR(a.createdAt) = :year";
        replacements.year = year;
      }

      const result = await sequelize.query(
        `
        SELECT 
          f.name as label,
          COUNT(a.id) as total_pendaftar,
          COUNT(CASE WHEN a.status = 'AWARDEE' THEN 1 END) as diterima,
          ROUND(
            (COUNT(CASE WHEN a.status = 'AWARDEE' THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0)),
            1
          ) as tingkat_keberhasilan,
          '#2D60FF' as color
        FROM faculties f
        LEFT JOIN departments d ON d.faculty_id = f.id
        LEFT JOIN study_programs sp ON sp.department_id = d.id
        LEFT JOIN students st ON st.study_program_id = sp.id
        LEFT JOIN users u ON u.id = st.id AND u.role = 'MAHASISWA'
        LEFT JOIN applications a ON st.id = a.student_id 
          AND a.status != 'DRAFT'
          ${yearCondition}
        INNER JOIN scholarship_schemas ss ON a.schema_id = ss.id
        INNER JOIN scholarships s ON ss.scholarship_id = s.id
        WHERE ${facultyWhere}
        GROUP BY f.id, f.name
        HAVING COUNT(a.id) >= 5
        ORDER BY tingkat_keberhasilan DESC, total_pendaftar DESC
        LIMIT 5
        `,
        {
          replacements,
          type: sequelize.QueryTypes.SELECT,
        },
      );

      return result;
    });

    return successResponse(
      res,
      "Top performing faculties retrieved successfully",
      facultyPerformance,
    );
  } catch (error) {
    console.error("Error fetching top performing faculties:", error);
    return errorResponse(
      res,
      "Failed to retrieve top performing faculties",
      500,
    );
  }
};

const getSelectionSummary = async (req, res) => {
  try {
    const { year } = req.query;
    const { facultyId, isFiltered } = getUserFacultyFilter(req);

    let baseWhere = {};

    if (year && year !== "all") {
      baseWhere.createdAt = {
        [Op.gte]: new Date(`${year}-01-01`),
        [Op.lte]: new Date(`${year}-12-31`),
      };
    }

    let includeUser = isFiltered
      ? [
          {
            model: Student,
            as: "student",
            attributes: [],
            required: true,
            include: [
              {
                model: StudyProgram,
                as: "study_program",
                attributes: [],
                required: true,
                include: [
                  {
                    model: Department,
                    as: "department",
                    attributes: [],
                    required: true,
                    where: { faculty_id: facultyId },
                  },
                ],
              },
            ],
          },
        ]
      : [];

    const [
      awardee,
      validated,
      menungguVerifikasi,
      verified,
      rejected,
      revisionNeeded,
    ] = await Promise.all([
      Application.count({
        where: {
          ...baseWhere,
          status: "AWARDEE",
        },
        include: includeUser,
      }),
      Application.count({
        where: {
          ...baseWhere,
          status: "VALIDATED",
        },
        include: includeUser,
      }),
      Application.count({
        where: { ...baseWhere, status: "MENUNGGU_VERIFIKASI" },
        include: includeUser,
      }),
      Application.count({
        where: { ...baseWhere, status: "VERIFIED" },
        include: includeUser,
      }),
      Application.count({
        where: { ...baseWhere, status: "REJECTED" },
        include: includeUser,
      }),
      Application.count({
        where: { ...baseWhere, status: "REVISION_NEEDED" },
        include: includeUser,
      }),
    ]);

    const summary = {
      awardee,
      validated,
      menungguVerifikasi,
      verified,
      rejected,
      revisionNeeded,
    };

    return successResponse(
      res,
      "Selection summary retrieved successfully",
      summary,
    );
  } catch (error) {
    console.error("Error fetching selection summary:", error);
    return errorResponse(res, "Failed to retrieve selection summary", 500);
  }
};

const getFacultyDistribution = async (req, res) => {
  try {
    const { year } = req.query;
    const { facultyId, isFiltered, role } = getUserFacultyFilter(req);

    const cacheKey = `faculty_distribution:${year || "all"}:${role}:${facultyId || "all"}`;

    const facultyData = await getOrSetCache(cacheKey, 600, async () => {
      let facultyWhere = "f.is_active = true";
      let replacements = {};

      let yearCondition = "";
      if (year && year !== "all") {
        yearCondition = "AND YEAR(a.createdAt) = :year";
        replacements.year = year;
      }

      if (isFiltered) {
        facultyWhere += " AND f.id = :facultyId";
        replacements.facultyId = facultyId;
      }

      const result = await sequelize.query(
        `
        SELECT 
          f.name as label,
          COUNT(a.id) as value
        FROM faculties f
        LEFT JOIN departments d ON d.faculty_id = f.id
        LEFT JOIN study_programs sp ON sp.department_id = d.id
        LEFT JOIN students st ON st.study_program_id = sp.id
        LEFT JOIN users u ON u.id = st.id AND u.role = 'MAHASISWA'
        LEFT JOIN applications a ON st.id = a.student_id 
          AND a.status != 'DRAFT'
          ${yearCondition}
        INNER JOIN scholarship_schemas ss ON a.schema_id = ss.id
        INNER JOIN scholarships s ON ss.scholarship_id = s.id
        WHERE ${facultyWhere}
        GROUP BY f.id, f.name
        HAVING COUNT(a.id) > 0
        ORDER BY value DESC
        LIMIT 5
        `,
        {
          replacements,
          type: sequelize.QueryTypes.SELECT,
        },
      );

      return result;
    });

    return successResponse(
      res,
      "Faculty distribution retrieved successfully",
      facultyData,
    );
  } catch (error) {
    console.error("Error fetching faculty distribution:", error);
    return errorResponse(res, "Failed to retrieve faculty distribution", 500);
  }
};

const getDepartmentDistribution = async (req, res) => {
  try {
    const { year } = req.query;
    const { facultyId, isFiltered, role } = getUserFacultyFilter(req);

    const cacheKey = `department_distribution:${year || "all"}:${role}:${facultyId || "all"}`;

    const departmentData = await getOrSetCache(cacheKey, 600, async () => {
      let departmentWhere = "d.is_active = true";
      let replacements = {};

      if (isFiltered) {
        departmentWhere += " AND d.faculty_id = :facultyId";
        replacements.facultyId = facultyId;
      }

      let yearCondition = "";
      if (year && year !== "all") {
        yearCondition = " AND YEAR(a.createdAt) = :year";
        replacements.year = year;
      }

      const result = await sequelize.query(
        `
        SELECT 
          d.name as label,
          COUNT(a.id) as value
        FROM departments d
        LEFT JOIN study_programs sp ON sp.department_id = d.id
        LEFT JOIN students st ON st.study_program_id = sp.id
        LEFT JOIN users u ON u.id = st.id AND u.role = 'MAHASISWA'
        LEFT JOIN applications a ON st.id = a.student_id 
          AND a.status != 'DRAFT'
          ${yearCondition}
        INNER JOIN scholarship_schemas ss ON a.schema_id = ss.id
        INNER JOIN scholarships s ON ss.scholarship_id = s.id 
        WHERE ${departmentWhere}
        GROUP BY d.id, d.name
        HAVING COUNT(a.id) > 0
        ORDER BY value DESC
        LIMIT 5
        `,
        {
          replacements,
          type: sequelize.QueryTypes.SELECT,
        },
      );

      return result;
    });

    return successResponse(
      res,
      "Department distribution retrieved successfully",
      departmentData,
    );
  } catch (error) {
    console.error("Error fetching department distribution:", error);
    return errorResponse(
      res,
      "Failed to retrieve department distribution",
      500,
    );
  }
};

const getYearlyTrend = async (req, res) => {
  try {
    const { facultyId, isFiltered, role } = getUserFacultyFilter(req);
    const startYear = 2024;
    const currentYear = new Date().getFullYear();

    const cacheKey = `yearly_trend:${role}:${facultyId || "all"}`;

    const yearlyData = await getOrSetCache(cacheKey, 900, async () => {
      let query = `
        SELECT 
          YEAR(a.createdAt) as year,
          COUNT(a.id) as count
        FROM applications a
        INNER JOIN scholarship_schemas ss ON a.schema_id = ss.id
        INNER JOIN scholarships s ON ss.scholarship_id = s.id
      `;

      let whereClause = `
        WHERE a.status != 'DRAFT'
        AND YEAR(a.createdAt) >= :startYear
        AND YEAR(a.createdAt) <= :currentYear
      `;

      let replacements = { startYear, currentYear };

      if (isFiltered) {
        query += `
          INNER JOIN students st ON a.student_id = st.id
          INNER JOIN study_programs sp ON st.study_program_id = sp.id
          INNER JOIN departments d ON sp.department_id = d.id
        `;
        whereClause += " AND d.faculty_id = :facultyId";
        replacements.facultyId = facultyId;
      }

      query += `${whereClause} GROUP BY YEAR(a.createdAt) ORDER BY year`;

      const results = await sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });

      return Array.from({ length: currentYear - startYear + 1 }, (_, i) => {
        const year = startYear + i;
        const found = results.find((r) => r.year === year);
        return {
          label: year.toString(),
          value: found ? parseInt(found.count) : 0,
        };
      });
    });

    return successResponse(
      res,
      "Yearly trend retrieved successfully",
      yearlyData,
    );
  } catch (error) {
    console.error("Error fetching yearly trend:", error);
    return errorResponse(res, "Failed to retrieve yearly trend", 500);
  }
};

const getGenderDistribution = async (req, res) => {
  try {
    const { year } = req.query;
    const { facultyId, isFiltered, role } = getUserFacultyFilter(req);

    const cacheKey = `gender_distribution:${year || "all"}:${role}:${facultyId || "all"}`;

    const genderData = await getOrSetCache(cacheKey, 600, async () => {
      let userWhere = "u.role = 'MAHASISWA' AND a.id IS NOT NULL";
      let replacements = {};

      if (isFiltered) {
        userWhere += " AND d.faculty_id = :facultyId";
        replacements.facultyId = facultyId;
      }

      let yearCondition = "";
      if (year && year !== "all") {
        yearCondition = " AND YEAR(a.createdAt) = :year";
        replacements.year = year;
      }

      const result = await sequelize.query(
        `
        SELECT 
          st.gender as label,
          COUNT(a.id) as value,
          CASE 
            WHEN st.gender = 'L' THEN '#2D60FF'
            WHEN st.gender = 'P' THEN '#FF69B4'
            ELSE '#9CA3AF'
          END as color
        FROM students st
        INNER JOIN users u ON u.id = st.id
        INNER JOIN study_programs sp ON st.study_program_id = sp.id
        INNER JOIN departments d ON sp.department_id = d.id
        LEFT JOIN applications a ON st.id = a.student_id 
          AND a.status != 'DRAFT'
          ${yearCondition}
        INNER JOIN scholarship_schemas ss ON a.schema_id = ss.id
        INNER JOIN scholarships s ON ss.scholarship_id = s.id
        WHERE ${userWhere}
        GROUP BY st.gender
        HAVING COUNT(a.id) > 0
        `,
        { replacements, type: sequelize.QueryTypes.SELECT },
      );

      return result.map((item) => ({
        ...item,
        label: item.label === "L" ? "Laki-laki" : "Perempuan",
      }));
    });

    return successResponse(
      res,
      "Gender distribution retrieved successfully",
      genderData,
    );
  } catch (error) {
    console.error("Error fetching gender distribution:", error);
    return errorResponse(res, "Failed to retrieve gender distribution", 500);
  }
};

const getStatusSummary = async (req, res) => {
  try {
    const { year } = req.query;
    const { facultyId, isFiltered, role } = getUserFacultyFilter(req);

    const cacheKey = `status_summary:${year || "all"}:${role}:${facultyId || "all"}`;

    const statusSummary = await getOrSetCache(cacheKey, 300, async () => {
      let baseWhere = "";
      let replacements = {};

      if (year && year !== "all") {
        baseWhere = `
          a.createdAt >= :startDate
          AND a.createdAt <= :endDate
        `;
        replacements.startDate = new Date(`${year}-01-01`);
        replacements.endDate = new Date(`${year}-12-31`);
      }

      let joinUser = "";
      if (isFiltered) {
        joinUser = `
          INNER JOIN students st ON a.student_id = st.id
          INNER JOIN study_programs sp ON st.study_program_id = sp.id
          INNER JOIN departments d ON sp.department_id = d.id
        `;
        baseWhere += baseWhere
          ? " AND d.faculty_id = :facultyId"
          : "d.faculty_id = :facultyId";
        replacements.facultyId = facultyId;
      }

      const results = await sequelize.query(
        `
        SELECT a.status, COUNT(a.id) as count
        FROM applications a
        INNER JOIN scholarship_schemas ss ON a.schema_id = ss.id
        INNER JOIN scholarships s ON ss.scholarship_id = s.id
        ${joinUser}
        ${baseWhere ? `WHERE ${baseWhere}` : ""}
        GROUP BY a.status
        `,
        { replacements, type: sequelize.QueryTypes.SELECT },
      );

      const statusMap = {
        MENUNGGU_VERIFIKASI: { label: "Menunggu Verifikasi", color: "#FF8C42" },
        VERIFIED: { label: "Terverifikasi", color: "#FFD23F" },
        VALIDATED: { label: "Divalidasi", color: "#06D6A0" },
        REJECTED: { label: "Ditolak", color: "#EF476F" },
        REVISION_NEEDED: { label: "Perlu Revisi", color: "#FFA500" },
      };

      return Object.entries(statusMap).map(([status, meta]) => {
        const found = results.find((r) => r.status === status);
        return {
          label: meta.label,
          value: found ? parseInt(found.count) : 0,
          color: meta.color,
        };
      });
    });

    return successResponse(
      res,
      "Status summary retrieved successfully",
      statusSummary,
    );
  } catch (error) {
    console.error("Error fetching status summary:", error);
    return errorResponse(res, "Failed to retrieve status summary", 500);
  }
};

const getActivities = async (req, res) => {
  try {
    const cacheKey = "recent_activities";

    const recentActivities = await getOrSetCache(cacheKey, 60, async () => {
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
            as: "user",
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: 5,
      });

      return recentActivityLogs
        .map((log) => {
          const timeAgo = getTimeAgo(log.createdAt);

          let type = "SISTEM";
          let description = log.description;

          if (
            log.action.includes("CREATE") ||
            log.action.includes("REGISTER")
          ) {
            if (log.entity_type === "APPLICATION") type = "PENDAFTARAN";
            else if (log.entity_type === "SCHOLARSHIP") type = "BEASISWA";
            else if (log.entity_type === "USER") type = "PENGGUNA";
          } else if (
            log.action.includes("UPDATE") ||
            log.action.includes("VERIFY")
          ) {
            if (log.entity_type === "APPLICATION") type = "VERIFIKASI";
            else if (log.entity_type === "SCHOLARSHIP") type = "BEASISWA";
          } else if (log.action.includes("DELETE")) {
            type = "PENGHAPUSAN";
          } else if (log.action.includes("LOGIN")) {
            type = "LOGIN";
          }

          if (!description) {
            const userName = log.User?.full_name || "Sistem";
            description = `${userName} melakukan ${log.action.toLowerCase()}`;
          }

          return {
            type,
            desc: description,
            time: timeAgo,
            timestamp: log.createdAt,
            user: log.User?.full_name || null,
            action: log.action,
          };
        })
        .slice(0, 8);
    });

    return successResponse(
      res,
      "Activities retrieved successfully",
      recentActivities,
    );
  } catch (error) {
    console.error("Error fetching activities:", error);
    return errorResponse(res, "Failed to retrieve activities", 500);
  }
};

const getApplicationsList = async (req, res) => {
  try {
    const { year, fakultas, departemen, gender, search, limit } = req.query;
    const { facultyId, isFiltered } = getUserFacultyFilter(req);

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

    let studentWhereCondition = {};

    let departmentWhereCondition = {};
    let facultyWhereCondition = {};

    if (gender && gender !== "Semua") {
      studentWhereCondition.gender = gender === "Laki-laki" ? "L" : "P";
    }

    if (departemen && departemen !== "Semua") {
      departmentWhereCondition.name = departemen;
    }

    if (fakultas && fakultas !== "Semua") {
      facultyWhereCondition.name = fakultas;
    }

    if (isFiltered && facultyId) {
      departmentWhereCondition.faculty_id = facultyId;
    }

    if (search) {
      studentWhereCondition[Op.or] = [
        { nim: { [Op.like]: `%${search}%` } },
        { "$user.full_name$": { [Op.like]: `%${search}%` } },
      ];
    }

    const applications = await Application.findAll({
      where: whereCondition,
      include: [
        {
          model: Student,
          as: "student",
          where: Object.keys(studentWhereCondition).length
            ? studentWhereCondition
            : undefined,
          required: true,
          attributes: ["id", "nim", "gender"],
          include: [
            {
              model: User,
              as: "user",
              required: true,
              where: userWhereCondition,
              attributes: ["full_name"],
            },
            {
              model: StudyProgram,
              as: "study_program",
              required: true,
              attributes: ["id", "name", "degree"],
              include: [
                {
                  model: Department,
                  as: "department",
                  where: Object.keys(departmentWhereCondition).length
                    ? departmentWhereCondition
                    : undefined,
                  required: Object.keys(departmentWhereCondition).length > 0,
                  attributes: ["id", "name"],
                  include: [
                    {
                      model: Faculty,
                      as: "faculty",
                      where: Object.keys(facultyWhereCondition).length
                        ? facultyWhereCondition
                        : undefined,
                      required: Object.keys(facultyWhereCondition).length > 0,
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
      ...(limit && { limit: parseInt(limit) }),
    });

    const transformedApplications = applications.map((app) => ({
      id: app.id,
      nama: app.student?.user?.full_name || "N/A",
      nim: app.student?.nim || "N/A",
      fakultas: app.student?.study_program?.department?.faculty?.name || "N/A",
      departemen: app.student?.study_program?.department?.name || "N/A",
      prodi:
        [app.student?.study_program?.degree, app.student?.study_program?.name]
          .filter(Boolean)
          .join(" ") || "N/A",
      gender:
        app.student?.gender === "L"
          ? "Laki-laki"
          : app.student?.gender === "P"
            ? "Perempuan"
            : "N/A",
      status: app.status,
      rawStatus: app.status,
      beasiswa: app.schema?.scholarship?.name || "N/A",
      tanggalDaftar: app.createdAt,
    }));

    return successResponse(
      res,
      "Applications list retrieved successfully",
      transformedApplications,
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

module.exports = {
  getSummary,
  getMonthlyTrend,
  getSelectionSummary,
  getFacultyDistribution,
  getDepartmentDistribution,
  getYearlyTrend,
  getGenderDistribution,
  getStatusSummary,
  getActivities,
  getApplicationsList,
  getScholarshipPerformance,
  getTopPerformingFaculties,
};
