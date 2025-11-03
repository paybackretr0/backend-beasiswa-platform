const express = require("express");
const router = express.Router();

const {
  authenticate,
  verifiedUser,
} = require("../middlewares/auth.middleware");
const { getApplicationByUser } = require("../controllers/history.controller");
const authorize = require("../middlewares/role.middleware");

router.use(authenticate, verifiedUser, authorize(["MAHASISWA"]));

router.get("/", getApplicationByUser);

module.exports = router;
