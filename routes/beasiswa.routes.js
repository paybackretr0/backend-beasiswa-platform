const express = require("express");
const router = express.Router();

const {
  authenticate,
  verifiedUser,
} = require("../middlewares/auth.middleware");
const { createUploadMiddleware } = require("../middlewares/upload.middleware");
const {
  getAllScholarships,
  createScholarship,
  getBeasiswaById,
  updateScholarship,
  deactivateScholarship,
  activateScholarship,
  getOtherScholarships,
  getActiveScholarshipsForInfo,
  activateSchema,
  deactivateSchema,
} = require("../controllers/beasiswa.controller");
const authorize = require("../middlewares/role.middleware");

const scholarshipUpload = createUploadMiddleware({
  category: "scholarships",
  fileType: "mixed",
  maxSize: 10 * 1024 * 1024,
});

router.get("/user", getAllScholarships);
router.get("/user/:id", getBeasiswaById);
router.get("/user/:id/others", getOtherScholarships);

router.get("/info/active", getActiveScholarshipsForInfo);

router.use(authenticate, verifiedUser, authorize("SUPERADMIN"));

router.get("/", getAllScholarships);
router.post(
  "/",
  scholarshipUpload.fields([
    { name: "requirement_file", maxCount: 1 },
    { name: "logo_file", maxCount: 1 },
  ]),
  createScholarship
);

router.get("/:id", getBeasiswaById);

router.put(
  "/:id",
  scholarshipUpload.fields([
    { name: "requirement_file", maxCount: 1 },
    { name: "logo_file", maxCount: 1 },
  ]),
  updateScholarship
);

router.patch("/:id/deactivate", deactivateScholarship);
router.patch("/:id/activate", activateScholarship);
router.patch("/schema/:schemaId/deactivate", deactivateSchema);
router.patch("/schema/:schemaId/activate", activateSchema);

module.exports = router;
