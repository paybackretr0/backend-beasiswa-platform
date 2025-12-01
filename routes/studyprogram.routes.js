const express = require("express");
const router = express.Router();
const {
  authenticate,
  verifiedUser,
} = require("../middlewares/auth.middleware");
const {
  getAllStudyPrograms,
  createStudyProgram,
  editStudyProgram,
  activateStudyProgram,
  deactivateStudyProgram,
} = require("../controllers/studyprogram.controller");
const authorize = require("../middlewares/role.middleware");

router.use(authenticate, verifiedUser, authorize("SUPERADMIN"));
router.get("/", getAllStudyPrograms);
router.post("/", createStudyProgram);
router.put("/:id", editStudyProgram);
router.put("/:id/activate", activateStudyProgram);
router.delete("/:id", deactivateStudyProgram);

module.exports = router;
