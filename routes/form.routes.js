const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");
const {
  checkScholarshipForm,
  createScholarshipForm,
  getScholarshipForm,
  updateScholarshipForm,
} = require("../controllers/form.controller");

router.use(authenticate, authorize(["SUPERADMIN", "VERIFIKATOR"]));

router.get("/check/:scholarshipId", checkScholarshipForm);
router.get("/:scholarshipId", getScholarshipForm);
router.post("/:scholarshipId", createScholarshipForm);
router.put("/:scholarshipId", updateScholarshipForm);

module.exports = router;
