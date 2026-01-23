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
  getGovernmentScholarshipList,
  exportGovernmentScholarships,
  validateGovernmentScholarshipFile,
  importGovernmentScholarships,
} = require("../controllers/government.controller");
const { excelUpload } = require("../middlewares/upload.middleware");

router.use(authenticate, verifiedUser);

router.get(
  "/list",
  authorize([
    "SUPERADMIN",
    "PIMPINAN_DITMAWA",
    "VALIDATOR_DITMAWA",
    "VERIFIKATOR_DITMAWA",
  ]),
  getGovernmentScholarshipList,
);

router.get(
  "/export",
  authorize([
    "SUPERADMIN",
    "PIMPINAN_DITMAWA",
    "VALIDATOR_DITMAWA",
    "VERIFIKATOR_DITMAWA",
  ]),
  exportGovernmentScholarships,
);

router.post(
  "/validate",
  authorize([
    "SUPERADMIN",
    "PIMPINAN_DITMAWA",
    "VALIDATOR_DITMAWA",
    "VERIFIKATOR_DITMAWA",
  ]),
  excelUpload.single("file"),
  validateGovernmentScholarshipFile,
);

router.post(
  "/import",
  authorize([
    "SUPERADMIN",
    "PIMPINAN_DITMAWA",
    "VALIDATOR_DITMAWA",
    "VERIFIKATOR_DITMAWA",
  ]),
  excelUpload.single("file"),
  importGovernmentScholarships,
);

router.use(
  authenticate,
  verifiedUser,
  authorize([
    "SUPERADMIN",
    "PIMPINAN_DITMAWA",
    "PIMPINAN_FAKULTAS",
    "VERIFIKATOR_DITMAWA",
    "VALIDATOR_DITMAWA",
  ]),
);

router.get("/summary", getGovernmentScholarshipSummary);
router.get("/distribution", getGovernmentScholarshipDistribution);
router.get("/categories", getGovernmentScholarshipByCategory);
router.get("/yearly-trend", getGovernmentScholarshipYearlyTrend);

module.exports = router;
