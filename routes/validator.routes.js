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
} = require("../controllers/validator.controller");

router.use(authenticate, verifiedUser, authorize(["PIMPINAN_DITMAWA"]));

router.put("/applications/:id/validate", validateApplication);
router.put("/applications/:id/reject", rejectApplication);

module.exports = router;
