const express = require("express");
const router = express.Router();
const {
  authenticate,
  verifiedUser,
} = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");
const {
  validateApplication,
  rejectApplication,
  requestRevision,
} = require("../controllers/validator.controller");
const {
  invalidateApplicationCache,
  invalidateHistoryCache,
} = require("../middlewares/cache.middleware");

router.use(authenticate, verifiedUser, authorize(["VALIDATOR_DITMAWA"]));

router.put(
  "/applications/:id/validate",
  invalidateApplicationCache,
  invalidateHistoryCache,
  validateApplication,
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
