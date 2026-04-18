const express = require("express");
const router = express.Router();
const {
  authenticate,
  verifiedUser,
} = require("../middlewares/auth.middleware");
const {
  getSummary,
  getSelectionSummary,
  getFacultyDistribution,
  getDepartmentDistribution,
  getYearlyTrend,
  getGenderDistribution,
  getStatusSummary,
  getActivities,
  getApplicationsList,
  getMonthlyTrend,
  getScholarshipPerformance,
  getTopPerformingFaculties,
} = require("../controllers/analytics.controller");
const {
  exportLaporanBeasiswa,
  exportPendaftarLaporan,
  downloadTemplateImportPenerima,
  validateImportPenerimaBeasiswa,
  importPenerimaBeasiswa,
} = require("../controllers/report.controller");
const authorize = require("../middlewares/role.middleware");
const { excelUpload } = require("../middlewares/upload.middleware");

router.use(
  authenticate,
  verifiedUser,
  authorize([
    "SUPERADMIN",
    "PIMPINAN_DITMAWA",
    "PIMPINAN_FAKULTAS",
    "VERIFIKATOR_FAKULTAS",
    "VERIFIKATOR_DITMAWA",
    "VALIDATOR_DITMAWA",
  ]),
);

// Summary endpoints
router.get("/summary", getSummary);
router.get("/selection-summary", getSelectionSummary);
router.get("/status-summary", getStatusSummary);

// Distribution endpoints
router.get("/faculty-distribution", getFacultyDistribution);
router.get("/department-distribution", getDepartmentDistribution);
router.get("/gender-distribution", getGenderDistribution);

// Trend endpoints
router.get("/yearly-trend", getYearlyTrend);
router.get("/monthly-trend", getMonthlyTrend);

// Performance endpoints
router.get("/scholarship-performance", getScholarshipPerformance);
router.get("/top-performing-faculties", getTopPerformingFaculties);

// List endpoints
router.get("/applications-list", getApplicationsList);
router.get("/activities", getActivities);

router.get("/export-laporan", exportLaporanBeasiswa);
router.get("/export-pendaftar", exportPendaftarLaporan);
router.get(
  "/import-penerima/template",
  authorize(["SUPERADMIN", "PIMPINAN_DITMAWA", "VALIDATOR_DITMAWA"]),
  downloadTemplateImportPenerima,
);
router.post(
  "/import-penerima/validate",
  authorize(["SUPERADMIN", "PIMPINAN_DITMAWA", "VALIDATOR_DITMAWA"]),
  excelUpload.single("file"),
  validateImportPenerimaBeasiswa,
);
router.post(
  "/import-penerima",
  authorize(["SUPERADMIN", "PIMPINAN_DITMAWA", "VALIDATOR_DITMAWA"]),
  excelUpload.single("file"),
  importPenerimaBeasiswa,
);

module.exports = router;
