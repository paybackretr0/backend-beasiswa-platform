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

// Middleware autentikasi untuk semua route
router.use(authenticate, verifiedUser);

// Get form untuk beasiswa tertentu (hanya mahasiswa)
router.get(
  "/scholarship/:scholarshipId/form",
  authorize(["MAHASISWA"]),
  getScholarshipForm
);

// Submit application dengan file upload (hanya mahasiswa)
router.post(
  "/scholarship/:scholarshipId/submit",
  authorize(["MAHASISWA"]),
  applicationUpload.any(),
  submitApplication
);

module.exports = router;
