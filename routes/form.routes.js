const express = require("express");
const router = express.Router();
const {
  authenticate,
  verifiedUser,
} = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");
const {
  checkScholarshipForm,
  createScholarshipForm,
  getScholarshipForm,
  updateScholarshipForm,
} = require("../controllers/form.controller");

router.use(
  authenticate,
  verifiedUser,
  authorize(["SUPERADMIN", "VERIFIKATOR"])
);

router.get("/check/:schemaId", checkScholarshipForm);
router.get("/:schemaId", getScholarshipForm);
router.post("/:schemaId", createScholarshipForm);
router.put("/:schemaId", updateScholarshipForm);

module.exports = router;
