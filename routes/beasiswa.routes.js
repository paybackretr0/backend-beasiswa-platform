const express = require("express");
const router = express.Router();

const { authenticate } = require("../middlewares/auth.middleware");
const { createUploadMiddleware } = require("../middlewares/upload.middleware");
const {
  getAllScholarships,
  createScholarship,
  getAllActiveScholarships,
} = require("../controllers/beasiswa.controller");

const scholarshipUpload = createUploadMiddleware({
  category: "scholarships",
  fileType: "mixed",
  maxSize: 10 * 1024 * 1024,
});

router.get("/active", getAllActiveScholarships);

router.use(authenticate);

router.get("/", getAllScholarships);
router.post(
  "/",
  scholarshipUpload.fields([
    { name: "requirement_file", maxCount: 1 },
    { name: "logo_file", maxCount: 1 },
  ]),
  createScholarship
);

module.exports = router;
