const express = require("express");
const router = express.Router();
const {
  authenticate,
  verifiedUser,
} = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");
const { validateApplication } = require("../controllers/validator.controller");

router.use(authenticate, verifiedUser, authorize(["PIMPINAN_DITMAWA"]));

router.put("/applications/:id/validate", validateApplication);

module.exports = router;
