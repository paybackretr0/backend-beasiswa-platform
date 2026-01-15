const express = require("express");
const router = express.Router();
const {
  getAllBackups,
  createBackup,
  getAllActivityLogs,
  exportActivityLogsToExcel,
  getAllCommentTemplates,
  getCommentTemplateById,
  createCommentTemplate,
  updateCommentTemplate,
  getActiveTemplatesByType,
  activateCommentTemplate,
  deactivateCommentTemplate,
} = require("../controllers/additional.controller");
const {
  authenticate,
  verifiedUser,
} = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

router.get(
  "/comment-templates/active/:type",
  authenticate,
  verifiedUser,
  authorize([
    "VERIFIKATOR_FAKULTAS",
    "VERIFIKATOR_DITMAWA",
    "VALIDATOR_DITMAWA",
  ]),
  getActiveTemplatesByType
);

router.use(authenticate, verifiedUser, authorize("SUPERADMIN"));
router.get("/backups", getAllBackups);
router.post("/backups", createBackup);
router.get("/activity-logs", getAllActivityLogs);
router.get("/activity-logs/export", exportActivityLogsToExcel);

router.get("/comment-templates", getAllCommentTemplates);
router.get("/comment-templates/:id", getCommentTemplateById);
router.post("/comment-templates", createCommentTemplate);
router.put("/comment-templates/:id", updateCommentTemplate);
router.patch("/comment-templates/activate/:id", activateCommentTemplate);
router.patch("/comment-templates/deactivate/:id", deactivateCommentTemplate);

module.exports = router;
