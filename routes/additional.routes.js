const express = require("express");
const router = express.Router();
const {
  getAllBackups,
  createBackup,
  getAllActivityLogs,
  exportActivityLogsToExcel,
} = require("../controllers/additional.controller");
const {
  authenticate,
  verifiedUser,
} = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

router.use(authenticate, verifiedUser, authorize("SUPERADMIN"));
router.get("/backups", getAllBackups);
router.post("/backups", createBackup);
router.get("/activity-logs", getAllActivityLogs);
router.get("/activity-logs/export", exportActivityLogsToExcel);

module.exports = router;
