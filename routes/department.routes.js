const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth.middleware");
const {
  getAllDepartments,
  createDepartment,
  editDepartment,
  activateDepartment,
  deactivateDepartment,
} = require("../controllers/department.controller");
const authorize = require("../middlewares/role.middleware");

router.use(authenticate, authorize("SUPERADMIN"));
router.get("/", getAllDepartments);
router.post("/", createDepartment);
router.put("/:id", editDepartment);
router.put("/:id/activate", activateDepartment);
router.delete("/:id", deactivateDepartment);

module.exports = router;
