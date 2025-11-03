const express = require("express");
const router = express.Router();
const {
  authenticate,
  verifiedUser,
} = require("../middlewares/auth.middleware");
const {
  getAllApplications,
  getApplicationsSummary,
} = require("../controllers/application.controller");
const authorize = require("../middlewares/role.middleware");

router.use(
  authenticate,
  verifiedUser,
  authorize(["SUPERADMIN", "PIMPINAN_DITMAWA", "VERIFIKATOR"])
);
router.get("/", getAllApplications);
router.get("/summary", getApplicationsSummary);

module.exports = router;
