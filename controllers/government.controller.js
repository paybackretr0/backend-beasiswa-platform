const { GovernmentScholarship, sequelize } = require("../models");
const { successResponse, errorResponse } = require("../utils/response");
const {
  getOrSetCache,
  invalidateGovernmentScholarshipCaches,
} = require("../utils/cacheHelper");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

const getGovernmentScholarshipSummary = async (req, res) => {
  try {
    const { year = "all" } = req.query;
    const cacheKey = `gov_summary:${year}`;

    const summary = await getOrSetCache(cacheKey, 600, async () => {
      let whereCondition = {};
      if (year !== "all") whereCondition.fiscal_year = year;

      const [totalPenerima, totalUnik, totalProgram] = await Promise.all([
        GovernmentScholarship.count({ where: whereCondition }),
        sequelize.query(
          year !== "all"
            ? `SELECT COUNT(DISTINCT nim) as count FROM government_scholarships WHERE fiscal_year = :year`
            : `SELECT COUNT(DISTINCT nim) as count FROM government_scholarships`,
          {
            replacements: year !== "all" ? { year } : {},
            type: sequelize.QueryTypes.SELECT,
          },
        ),
        GovernmentScholarship.count({
          distinct: true,
          col: "assistance_scheme",
          where: whereCondition,
        }),
      ]);

      return {
        totalPenerima: totalPenerima || 0,
        totalNominal: 0,
        totalMahasiswaUnik: totalUnik[0]?.count || 0,
        totalProgram: totalProgram || 0,
      };
    });

    return successResponse(res, "Summary retrieved", summary);
  } catch (err) {
    console.error(err);
    return errorResponse(res, "Failed to retrieve summary", 500);
  }
};

const getGovernmentScholarshipDistribution = async (req, res) => {
  try {
    const { year = "all" } = req.query;
    const cacheKey = `gov_distribution:program:${year}`;

    const data = await getOrSetCache(cacheKey, 600, async () => {
      let whereClause = "";
      let replacements = {};

      if (year !== "all") {
        whereClause = "WHERE fiscal_year = :year";
        replacements.year = year;
      }

      return sequelize.query(
        `
        SELECT study_program as label, COUNT(*) as value
        FROM government_scholarships
        ${whereClause}
        GROUP BY study_program
        ORDER BY value DESC
        LIMIT 10
        `,
        { replacements, type: sequelize.QueryTypes.SELECT },
      );
    });

    return successResponse(res, "Distribution retrieved", data);
  } catch (err) {
    console.error(err);
    return errorResponse(res, "Failed to retrieve distribution", 500);
  }
};

const getGovernmentScholarshipByCategory = async (req, res) => {
  try {
    const { year = "all" } = req.query;
    const cacheKey = `gov_category:${year}`;

    const categories = await getOrSetCache(cacheKey, 600, async () => {
      let whereClause = "";
      let replacements = {};

      if (year !== "all") {
        whereClause = "WHERE fiscal_year = :year";
        replacements.year = year;
      }

      return sequelize.query(
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
    });

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

    let whereCondition = {};
    if (year && year !== "all") {
      whereCondition.fiscal_year = year;
    }

    const scholarships = await GovernmentScholarship.findAll({
      where: whereCondition,
      order: [
        ["fiscal_year", "DESC"],
        ["ipk", "DESC"],
        ["student_name", "ASC"],
      ],
      raw: true,
    });

    if (scholarships.length === 0) {
      return errorResponse(res, "Tidak ada data untuk diexport", 404);
    }

    const normalStudents = scholarships.filter(
      (s) => s.ipk !== null && s.ipk >= 2.75,
    );
    const warningStudents = scholarships.filter(
      (s) => s.ipk === null || s.ipk < 2.75,
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Beasiswa APBN");

    worksheet.columns = [
      { width: 5 },
      { width: 15 },
      { width: 30 },
      { width: 12 },
      { width: 35 },
      { width: 10 },
      { width: 10 },
      { width: 15 },
      { width: 30 },
      { width: 12 },
      { width: 12 },
    ];

    worksheet.mergeCells("A1:K1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = `DATA PENERIMA BEASISWA PEMERINTAH (APBN) ${year && year !== "all" ? `TAHUN ${year}` : ""}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2D60FF" },
    };
    titleCell.font = { ...titleCell.font, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).height = 25;

    worksheet.mergeCells("A2:K2");
    const infoCell = worksheet.getCell("A2");
    infoCell.value = `Total Penerima: ${scholarships.length} | Normal (IPK ≥ 2.75): ${normalStudents.length} | Warning (IPK < 2.75): ${warningStudents.length}`;
    infoCell.font = { italic: true, size: 10 };
    infoCell.alignment = { horizontal: "center" };
    worksheet.getRow(2).height = 20;

    worksheet.addRow([]);

    worksheet.mergeCells("A4:K4");
    const normalHeaderCell = worksheet.getCell("A4");
    normalHeaderCell.value = `MAHASISWA DENGAN IPK ≥ 2.75 (NORMAL) - ${normalStudents.length} Mahasiswa`;
    normalHeaderCell.font = {
      bold: true,
      size: 11,
      color: { argb: "FFFFFFFF" },
    };
    normalHeaderCell.alignment = { horizontal: "center", vertical: "middle" };
    normalHeaderCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF22C55E" },
    };
    worksheet.getRow(4).height = 20;

    const headerRow = worksheet.addRow([
      "No",
      "NIM",
      "Nama Mahasiswa",
      "Angkatan",
      "Program Studi",
      "Semester",
      "IPK",
      "Status Akademik",
      "Skema Bantuan",
      "Tahun Fiskal",
      "Periode",
    ]);

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4B5563" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    headerRow.height = 20;

    normalStudents.forEach((student, index) => {
      const row = worksheet.addRow([
        index + 1,
        student.nim,
        student.student_name,
        student.student_batch || "-",
        student.study_program || "-",
        student.semester || "-",
        student.ipk ? student.ipk.toFixed(2) : "0.00",
        student.academic_status || "NORMAL",
        student.assistance_scheme || "-",
        student.fiscal_year,
        student.period || "-",
      ]);

      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };

        if ([1, 4, 6, 7, 10, 11].includes(colNumber)) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else {
          cell.alignment = { vertical: "middle" };
        }

        if (colNumber === 7) {
          cell.font = { bold: true, color: { argb: "FF22C55E" } };
        }
      });

      if (index % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF9FAFB" },
          };
        });
      }
    });

    const separatorRow = worksheet.addRow([]);
    separatorRow.height = 8;
    worksheet.mergeCells(`A${separatorRow.number}:K${separatorRow.number}`);
    const separatorCell = worksheet.getCell(`A${separatorRow.number}`);
    separatorCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEF4444" },
    };
    separatorCell.border = {
      top: { style: "thick", color: { argb: "FFEF4444" } },
      bottom: { style: "thick", color: { argb: "FFEF4444" } },
    };

    worksheet.addRow([]);

    const warningHeaderRow = worksheet.addRow([]);
    worksheet.mergeCells(
      `A${warningHeaderRow.number}:K${warningHeaderRow.number}`,
    );
    const warningHeaderCell = worksheet.getCell(`A${warningHeaderRow.number}`);
    warningHeaderCell.value = `⚠️ MAHASISWA DENGAN IPK < 2.75 (WARNING) - ${warningStudents.length} Mahasiswa`;
    warningHeaderCell.font = {
      bold: true,
      size: 11,
      color: { argb: "FFFFFFFF" },
    };
    warningHeaderCell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    warningHeaderCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF59E0B" },
    };
    worksheet.getRow(warningHeaderRow.number).height = 20;

    const warningTableHeader = worksheet.addRow([
      "No",
      "NIM",
      "Nama Mahasiswa",
      "Angkatan",
      "Program Studi",
      "Semester",
      "IPK",
      "Status Akademik",
      "Skema Bantuan",
      "Tahun Fiskal",
      "Periode",
    ]);

    warningTableHeader.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4B5563" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    warningTableHeader.height = 20;

    warningStudents.forEach((student, index) => {
      const row = worksheet.addRow([
        index + 1,
        student.nim,
        student.student_name,
        student.student_batch || "-",
        student.study_program || "-",
        student.semester || "-",
        student.ipk ? student.ipk.toFixed(2) : "0.00",
        student.academic_status || "WARNING",
        student.assistance_scheme || "-",
        student.fiscal_year,
        student.period || "-",
      ]);

      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };

        if ([1, 4, 6, 7, 10, 11].includes(colNumber)) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else {
          cell.alignment = { vertical: "middle" };
        }

        if (colNumber === 7) {
          cell.font = { bold: true, color: { argb: "FFEF4444" } };
        }
      });

      row.eachCell((cell) => {
        if (!cell.fill || !cell.fill.fgColor) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFEF3C7" },
          };
        }
      });
    });

    const footerRow = worksheet.addRow([]);
    worksheet.mergeCells(`A${footerRow.number}:K${footerRow.number}`);
    const footerCell = worksheet.getCell(`A${footerRow.number}`);
    footerCell.value = `Diekspor pada: ${new Date().toLocaleString("id-ID")} | Total: ${scholarships.length} data`;
    footerCell.font = { italic: true, size: 9, color: { argb: "FF6B7280" } };
    footerCell.alignment = { horizontal: "center" };

    const fileName = `Beasiswa_APBN_${year && year !== "all" ? year : "All"}_${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, "../uploads", fileName);

    await workbook.xlsx.writeFile(filePath);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        return errorResponse(res, "Gagal mendownload file", 500);
      }

      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error("Error deleting file:", unlinkErr);
      });
    });
  } catch (error) {
    console.error("Error exporting:", error);
    return errorResponse(res, error.message || "Gagal mengexport data", 500);
  }
};

const validateGovernmentScholarshipFile = async (req, res) => {
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

    const validData = [];
    const errors = [];

    rawData.forEach((row) => {
      const nimValue = typeof row.NIM === "object" ? row.NIM?.text : row.NIM;

      if (!nimValue) {
        errors.push({
          row: row.excelRow,
          field: "NIM",
          message: "NIM wajib diisi",
        });
        return;
      }

      if (!row.nama) {
        errors.push({
          row: row.excelRow,
          field: "Nama",
          message: "Nama Mahasiswa wajib diisi",
        });
        return;
      }

      validData.push({
        nim: String(nimValue).trim(),
        student_name: row.nama.toString().trim(),
        student_batch: row.angkatan ? parseInt(row.angkatan) : null,
        study_program: row.prodi ? row.prodi.toString().trim() : null,
        semester: row.semester ? parseInt(row.semester) : null,
        assistance_scheme: row.skema ? row.skema.toString().trim() : null,
      });
    });

    return successResponse(res, "Validasi berhasil", {
      fiscal_year: fiscalYear,
      period,
      valid_count: validData.length,
      error_count: errors.length,
      errors: errors.slice(0, 10),
      preview: validData.slice(0, 10),
      total_rows: rawData.length,
    });
  } catch (error) {
    console.error("Validation Error:", error);
    return errorResponse(res, error.message || "Gagal memvalidasi file", 500);
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};

const importGovernmentScholarships = async (req, res) => {
  const transaction = await sequelize.transaction();
  const filePath = req.file?.path ?? null;

  try {
    if (!req.file) {
      return errorResponse(res, "File Excel wajib diupload", 400);
    }

    const importMode = req.body.mode || "replace";

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

    let deletedCount = 0;
    let updatedCount = 0;
    let newCount = 0;

    if (importMode === "replace") {
      deletedCount = await GovernmentScholarship.destroy({
        where: { fiscal_year: fiscalYear, period },
        transaction,
      });

      await GovernmentScholarship.bulkCreate(importData, {
        transaction,
        validate: true,
      });

      newCount = importData.length;
    } else {
      for (const data of importData) {
        const existing = await GovernmentScholarship.findOne({
          where: {
            nim: data.nim,
            fiscal_year: fiscalYear,
            period,
          },
          transaction,
        });

        if (existing) {
          await existing.update(data, { transaction });
          updatedCount++;
        } else {
          await GovernmentScholarship.create(data, { transaction });
          newCount++;
        }
      }
    }

    await transaction.commit();

    const responseData = {
      mode: importMode,
      fiscal_year: fiscalYear,
      period,
      total_processed: importData.length,
    };

    if (importMode === "replace") {
      responseData.deleted = deletedCount;
      responseData.imported = newCount;
    } else {
      responseData.updated = updatedCount;
      responseData.new = newCount;
    }

    return successResponse(res, "Data berhasil diimport", responseData);
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
  validateGovernmentScholarshipFile,
  exportGovernmentScholarships,
  importGovernmentScholarships,
};
