const express = require("express");
const router = express.Router();
const {
  authenticate,
  verifiedUser,
} = require("../middlewares/auth.middleware");
const {
  getAllApplications,
  getApplicationsSummary,
  getApplicationDetail,
  getApplicationComments,
} = require("../controllers/application.controller");
const authorize = require("../middlewares/role.middleware");

router.get("/:id/comments", authenticate, verifiedUser, getApplicationComments);

router.get(
  "/user/:id",
  authenticate,
  verifiedUser,
  authorize(["MAHASISWA"]),
  getApplicationDetail,
);

router.use(
  authenticate,
  verifiedUser,
  authorize([
    "SUPERADMIN",
    "PIMPINAN_DITMAWA",
    "VERIFIKATOR_FAKULTAS",
    "VERIFIKATOR_DITMAWA",
    "VALIDATOR_DITMAWA",
  ]),
);
router.get("/", getAllApplications);
router.get("/summary", getApplicationsSummary);
router.get("/:id", getApplicationDetail);

module.exports = router;
