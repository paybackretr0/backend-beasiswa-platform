const express = require("express");
const router = express.Router();
const {
  authenticate,
  verifiedUser,
} = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");
const {
  verifyApplication,
  rejectApplication,
} = require("../controllers/verifikator.controller");

router.use(authenticate, verifiedUser, authorize(["VERIFIKATOR"]));

router.put("/applications/:id/verify", verifyApplication);
router.put("/applications/:id/reject", rejectApplication);

module.exports = router;
