const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth.middleware");
const { getAllFaculties } = require("../controllers/faculty.controller");

router.use(authenticate); // Middleware autentikasi
router.get("/", getAllFaculties); // Endpoint untuk mendapatkan daftar fakultas

module.exports = router;
