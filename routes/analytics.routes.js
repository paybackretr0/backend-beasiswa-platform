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
const authorize = require("../middlewares/role.middleware");

router.use(
  authenticate,
  verifiedUser,
  authorize([
    "SUPERADMIN",
    "PIMPINAN_DITMAWA",
    "PIMPINAN_FAKULTAS",
    "VERIFIKATOR",
  ])
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

module.exports = router;
