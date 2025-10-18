const express = require("express");
const router = express.Router();

const { authenticate } = require("../middlewares/auth.middleware");
const { getApplicationByUser } = require("../controllers/history.controller");
const authorize = require("../middlewares/role.middleware");

router.use(authenticate, authorize(["MAHASISWA"]));

router.get("/", getApplicationByUser);

module.exports = router;
