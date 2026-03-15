const express = require("express");
const router = express.Router();
const {
  authenticate,
  verifiedUser,
} = require("../middlewares/auth.middleware");
const {
  getDepartmentsByFacultyId,
  getAllFaculties,
  createFaculty,
  editFaculty,
  activateFaculty,
  deactivateFaculty,
} = require("../controllers/faculty.controller");
const authorize = require("../middlewares/role.middleware");

router.get("/public", getAllFaculties);
router.get("/public/:facultyId/departments", getDepartmentsByFacultyId);

router.use(authenticate, verifiedUser, authorize("SUPERADMIN"));
router.get("/", getAllFaculties);
router.post("/", createFaculty);
router.put("/:id", editFaculty);
router.put("/:id/activate", activateFaculty);
router.delete("/:id", deactivateFaculty);

module.exports = router;
