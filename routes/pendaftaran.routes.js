const express = require("express");
const router = express.Router();
const {
  authenticate,
  verifiedUser,
} = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");
const { applicationUpload } = require("../middlewares/upload.middleware");
const {
  getScholarshipForm,
  submitApplication,
} = require("../controllers/pendaftaran.controller");

router.use(authenticate, verifiedUser);

router.get(
  "/scholarship/:scholarshipId/form",
  authorize(["MAHASISWA"]),
  getScholarshipForm
);

router.post(
  "/scholarship/:scholarshipId/submit",
  authorize(["MAHASISWA"]),
  applicationUpload.any(),
  submitApplication
);

module.exports = router;
