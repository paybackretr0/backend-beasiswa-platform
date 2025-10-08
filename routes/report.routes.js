const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth.middleware");
const {
  getMainSummary,
  getSelectionSummary,
  getFacultyDistribution,
  getDepartmentDistribution,
  getYearlyTrend,
  getGenderDistribution,
  getApplicationsList,
} = require("../controllers/report.controller");

router.use(authenticate);

router.get("/main-summary", getMainSummary);
router.get("/selection-summary", getSelectionSummary);
router.get("/faculty-distribution", getFacultyDistribution);
router.get("/department-distribution", getDepartmentDistribution);
router.get("/yearly-trend", getYearlyTrend);
router.get("/gender-distribution", getGenderDistribution);
router.get("/applications-list", getApplicationsList);

module.exports = router;
