const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth.middleware");
const {
  getAllApplications,
  getApplicationsSummary,
} = require("../controllers/pendaftaran.controller");

router.use(authenticate);
router.get("/", getAllApplications);
router.get("/summary", getApplicationsSummary);

module.exports = router;
