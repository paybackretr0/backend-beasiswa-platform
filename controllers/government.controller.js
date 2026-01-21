const { GovernmentScholarship, sequelize } = require("../models");
const { successResponse, errorResponse } = require("../utils/response");
const ExcelJS = require("exceljs");
const fs = require("fs");

const getGovernmentScholarshipSummary = async (req, res) => {
  try {
    const { year } = req.query;

    let whereCondition = {};
    if (year && year !== "all") {
      whereCondition.fiscal_year = year;
    }

    const [totalPenerima, totalUnik, totalProgram] = await Promise.all([
      GovernmentScholarship.count({
        where: whereCondition,
      }),
      sequelize.query(
        year && year !== "all"
          ? `SELECT COUNT(DISTINCT nim) as count FROM government_scholarships WHERE fiscal_year = :year`
          : `SELECT COUNT(DISTINCT nim) as count FROM government_scholarships`,
        {
          replacements: year && year !== "all" ? { year } : {},
          type: sequelize.QueryTypes.SELECT,
        },
      ),
      GovernmentScholarship.count({
        distinct: true,
        col: "assistance_scheme",
        where: whereCondition,
      }),
    ]);

    const summary = {
      totalPenerima: totalPenerima || 0,
      totalNominal: 0,
      totalMahasiswaUnik: totalUnik[0]?.count || 0,
      totalProgram: totalProgram || 0,
    };

    return successResponse(
      res,
      "Government scholarship summary retrieved successfully",
      summary,
    );
  } catch (error) {
    console.error("Error fetching government scholarship summary:", error);
    return errorResponse(
      res,
      "Failed to retrieve government scholarship summary",
      500,
    );
  }
};

const getGovernmentScholarshipDistribution = async (req, res) => {
  try {
    const { year } = req.query;

    let whereClause = "";
    let replacements = {};

    if (year && year !== "all") {
      whereClause = "WHERE fiscal_year = :year";
      replacements.year = year;
    }

    const distribution = await sequelize.query(
      `
      SELECT 
        study_program as label,
        COUNT(*) as value
      FROM government_scholarships
      ${whereClause}
      GROUP BY study_program
      ORDER BY value DESC
      LIMIT 10
      `,
      {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      },
    );

    return successResponse(
      res,
      "Government scholarship distribution retrieved successfully",
      distribution,
    );
  } catch (error) {
    console.error("Error fetching government scholarship distribution:", error);
    return errorResponse(
      res,
      "Failed to retrieve government scholarship distribution",
      500,
    );
  }
};

const getGovernmentScholarshipByCategory = async (req, res) => {
  try {
    const { year } = req.query;

    let whereClause = "";
    let replacements = {};

    if (year && year !== "all") {
      whereClause = "WHERE fiscal_year = :year";
      replacements.year = year;
    }

    const categories = await sequelize.query(
      `
      SELECT 
        assistance_scheme as label, 
        COUNT(*) as value,
        '#2D60FF' as color
      FROM government_scholarships
      ${whereClause}
      GROUP BY assistance_scheme
      ORDER BY value DESC
      `,
      {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      },
    );

    return successResponse(
      res,
      "Government scholarship categories retrieved successfully",
      categories,
    );
  } catch (error) {
    console.error("Error fetching government scholarship categories:", error);
    return errorResponse(
      res,
      "Failed to retrieve government scholarship categories",
      500,
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
          where: { fiscal_year: year },
        });
        return { label: year.toString(), value: count };
      }),
    );

    return successResponse(
      res,
      "Government scholarship yearly trend retrieved successfully",
      yearlyData,
    );
  } catch (error) {
    console.error("Error fetching government scholarship yearly trend:", error);
    return errorResponse(
      res,
      "Failed to retrieve government scholarship yearly trend",
      500,
    );
  }
};

const getGovernmentScholarshipList = async (req, res) => {
  try {
    const { year, status, program, search } = req.query;

    let whereCondition = {};

    if (year && year !== "all") {
      whereCondition.fiscal_year = year;
    }

    if (status && status !== "Semua") {
      whereCondition.academic_status = status;
    }

    if (program && program !== "Semua") {
      whereCondition.study_program = program;
    }

    if (search) {
      whereCondition[Op.or] = [
        { nim: { [Op.like]: `%${search}%` } },
        { student_name: { [Op.like]: `%${search}%` } },
        { study_program: { [Op.like]: `%${search}%` } },
        { assistance_scheme: { [Op.like]: `%${search}%` } },
      ];
    }

    const scholarships = await GovernmentScholarship.findAll({
      where: whereCondition,
      order: [
        ["fiscal_year", "DESC"],
        ["student_name", "ASC"],
      ],
    });

    return successResponse(
      res,
      "Government scholarship list retrieved successfully",
      scholarships,
    );
  } catch (error) {
    console.error("Error fetching government scholarship list:", error);
    return errorResponse(
      res,
      "Failed to retrieve government scholarship list",
      500,
    );
  }
};

const exportGovernmentScholarships = async (req, res) => {
  try {
    const { year } = req.query;

    // Implementation for Excel export
    // You can use libraries like exceljs or xlsx

    return successResponse(res, "Export successful");
  } catch (error) {
    console.error("Error exporting:", error);
    return errorResponse(res, "Failed to export data", 500);
  }
};

const importGovernmentScholarships = async (req, res) => {
  const transaction = await sequelize.transaction();
  const filePath = req.file?.path ?? null;

  try {
    if (!req.file) {
      return errorResponse(res, "File Excel wajib diupload", 400);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error("Worksheet tidak ditemukan");
    }

    let fiscalYear = new Date().getFullYear();
    let period = "Ganjil";

    const headerText = worksheet.getCell("A1").value?.toString().toUpperCase();

    if (headerText && headerText.includes("PERIODE:")) {
      const [, periodPart] = headerText.split("PERIODE:");
      if (periodPart) {
        const [p, y] = periodPart.split("/");
        if (p && y && !isNaN(y.trim())) {
          period = p.trim();
          fiscalYear = parseInt(y.trim());
        }
      }
    }

    let headerRowNumber = null;

    worksheet.eachRow((row, rowNumber) => {
      const value = row.getCell(3).value;
      if (typeof value === "string" && value.trim().toUpperCase() === "NIM") {
        headerRowNumber = rowNumber;
      }
    });

    if (!headerRowNumber) {
      throw new Error("Header kolom NIM tidak ditemukan");
    }

    const rawData = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowNumber) return;
      if (row.actualCellCount === 0) return;

      rawData.push({
        NIM: row.getCell(3).value,
        nama: row.getCell(4).value,
        semester: row.getCell(8).value,
        angkatan: row.getCell(9).value,
        prodi: row.getCell(11).value,
        skema: row.getCell(17).value,
        excelRow: rowNumber,
      });
    });

    if (rawData.length === 0) {
      throw new Error("File Excel kosong atau tidak berisi data");
    }

    const importData = [];
    const errors = [];

    rawData.forEach((row) => {
      const nimValue = typeof row.NIM === "object" ? row.NIM?.text : row.NIM;

      if (!nimValue) {
        errors.push(`Baris ${row.excelRow}: NIM wajib diisi`);
        return;
      }

      if (!row.nama) {
        errors.push(`Baris ${row.excelRow}: Nama Mahasiswa wajib diisi`);
        return;
      }

      importData.push({
        nim: String(nimValue).trim(),
        student_name: row.nama.toString().trim(),
        student_batch: row.angkatan ? parseInt(row.angkatan) : null,
        study_program: row.prodi ? row.prodi.toString().trim() : null,
        semester: row.semester ? parseInt(row.semester) : null,
        fiscal_year: fiscalYear,
        period,
        ipk: null,
        academic_status: "WARNING",
        assistance_scheme: row.skema ? row.skema.toString().trim() : null,
        last_synced_at: new Date(),
        imported_by: req.user?.id ?? null,
        imported_at: new Date(),
      });
    });

    if (errors.length > 0) {
      return errorResponse(
        res,
        `Ditemukan ${errors.length} error:\n${errors
          .slice(0, 5)
          .join(
            "\n",
          )}${errors.length > 5 ? `\n... dan ${errors.length - 5} error lainnya` : ""}`,
        400,
      );
    }

    if (importData.length === 0) {
      return errorResponse(
        res,
        "Tidak ada data valid yang dapat diimport",
        400,
      );
    }

    const deletedCount = await GovernmentScholarship.destroy({
      where: { fiscal_year: fiscalYear, period },
      transaction,
    });

    await GovernmentScholarship.bulkCreate(importData, {
      transaction,
      validate: true,
    });

    await transaction.commit();

    return successResponse(res, "Data berhasil diimport", {
      imported: importData.length,
      deleted: deletedCount,
      fiscal_year: fiscalYear,
      period,
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error("Import Error:", error);
    return errorResponse(res, error.message || "Gagal mengimport data", 500);
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};

module.exports = {
  getGovernmentScholarshipSummary,
  getGovernmentScholarshipDistribution,
  getGovernmentScholarshipByCategory,
  getGovernmentScholarshipYearlyTrend,
  getGovernmentScholarshipList,
  exportGovernmentScholarships,
  importGovernmentScholarships,
};
