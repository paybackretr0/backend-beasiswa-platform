const express = require("express");
const router = express.Router();
const {
  authenticate,
  verifiedUser,
} = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");
const {
  getGovernmentScholarshipSummary,
  getGovernmentScholarshipDistribution,
  getGovernmentScholarshipByCategory,
  getGovernmentScholarshipYearlyTrend,
} = require("../controllers/government.controller");

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

router.get("/summary", getGovernmentScholarshipSummary);
router.get("/distribution", getGovernmentScholarshipDistribution);
router.get("/categories", getGovernmentScholarshipByCategory);
router.get("/yearly-trend", getGovernmentScholarshipYearlyTrend);

module.exports = router;
