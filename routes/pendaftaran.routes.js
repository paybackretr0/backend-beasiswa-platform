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
  submitRevision,
} = require("../controllers/pendaftaran.controller");

router.use(authenticate, verifiedUser);

router.get(
  "/scholarship/:scholarshipId/form",
  authorize(["MAHASISWA"]),
  getScholarshipForm,
);

router.post(
  "/scholarship/:scholarshipId/submit",
  authorize(["MAHASISWA"]),
  applicationUpload.any(),
  submitApplication,
);

router.put(
  "/application/:applicationId/revision",
  authorize(["MAHASISWA"]),
  applicationUpload.any(),
  submitRevision,
);

module.exports = router;
