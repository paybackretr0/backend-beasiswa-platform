const { GovernmentScholarship, User, sequelize } = require("../models");
const { successResponse, errorResponse } = require("../utils/response");
const { Op } = require("sequelize");

const getGovernmentScholarshipSummary = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const [totalPenerima, totalNominal, totalUnik, totalProgram] =
      await Promise.all([
        GovernmentScholarship.count({
          where: { acceptance_year: year },
        }),
        GovernmentScholarship.sum("living_expenses", {
          where: { acceptance_year: year },
        }),
        sequelize.query(
          `SELECT COUNT(DISTINCT nim) as count FROM government_scholarships WHERE acceptance_year = :year`,
          {
            replacements: { year },
            type: sequelize.QueryTypes.SELECT,
          }
        ),
        GovernmentScholarship.count({
          distinct: true,
          col: "scholarship_category",
          where: { acceptance_year: year },
        }),
      ]);

    const summary = {
      totalPenerima: totalPenerima || 0,
      totalNominal: totalNominal || 0,
      totalMahasiswaUnik: totalUnik[0]?.count || 0,
      totalProgram: totalProgram || 0,
    };

    return successResponse(
      res,
      "Government scholarship summary retrieved successfully",
      summary
    );
  } catch (error) {
    console.error("Error fetching government scholarship summary:", error);
    return errorResponse(
      res,
      "Failed to retrieve government scholarship summary",
      500
    );
  }
};

const getGovernmentScholarshipDistribution = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const distribution = await sequelize.query(
      `
      SELECT 
        study_program as label,
        COUNT(*) as value
      FROM government_scholarships
      WHERE acceptance_year = :year
      GROUP BY study_program
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
      "Government scholarship distribution retrieved successfully",
      distribution
    );
  } catch (error) {
    console.error("Error fetching government scholarship distribution:", error);
    return errorResponse(
      res,
      "Failed to retrieve government scholarship distribution",
      500
    );
  }
};

const getGovernmentScholarshipByCategory = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const categories = await sequelize.query(
      `
      SELECT 
        scholarship_category as label,
        COUNT(*) as value,
        '#2D60FF' as color
      FROM government_scholarships
      WHERE acceptance_year = :year
      GROUP BY scholarship_category
      ORDER BY value DESC
      `,
      {
        replacements: { year },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    return successResponse(
      res,
      "Government scholarship categories retrieved successfully",
      categories
    );
  } catch (error) {
    console.error("Error fetching government scholarship categories:", error);
    return errorResponse(
      res,
      "Failed to retrieve government scholarship categories",
      500
    );
  }
};

const getGovernmentScholarshipYearlyTrend = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);

    const yearlyData = await Promise.all(
      years.map(async (year) => {
        const count = await GovernmentScholarship.count({
          where: { acceptance_year: year },
        });
        return { label: year.toString(), value: count };
      })
    );

    return successResponse(
      res,
      "Government scholarship yearly trend retrieved successfully",
      yearlyData
    );
  } catch (error) {
    console.error("Error fetching government scholarship yearly trend:", error);
    return errorResponse(
      res,
      "Failed to retrieve government scholarship yearly trend",
      500
    );
  }
};

module.exports = {
  getGovernmentScholarshipSummary,
  getGovernmentScholarshipDistribution,
  getGovernmentScholarshipByCategory,
  getGovernmentScholarshipYearlyTrend,
};
