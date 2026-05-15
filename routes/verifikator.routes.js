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
  requestRevision,
} = require("../controllers/verifikator.controller");
const {
  invalidateApplicationCache,
  invalidateHistoryCache,
} = require("../middlewares/cache.middleware");

router.use(
  authenticate,
  verifiedUser,
  authorize(["VERIFIKATOR_FAKULTAS", "VERIFIKATOR_DITMAWA"]),
);

router.put(
  "/applications/:id/verify",
  invalidateApplicationCache,
  invalidateHistoryCache,
  verifyApplication,
);
router.put(
  "/applications/:id/reject",
  invalidateApplicationCache,
  invalidateHistoryCache,
  rejectApplication,
);
router.put(
  "/applications/:id/request-revision",
  invalidateApplicationCache,
  invalidateHistoryCache,
  requestRevision,
);

module.exports = router;
