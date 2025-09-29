const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");
const {
  addPimpinanVerifikator,
  addMahasiswa,
  addPimpinanFakultas,
  updateUser,
  deactivateUser,
  getMahasiswa,
  getPimpinanFakultas,
  getPimpinanDitmawa,
  getVerifikator,
  activateUser,
} = require("../controllers/user.controller");
const { validateRegister } = require("../validators/auth.validator");

// Middleware untuk autentikasi
router.use(authenticate, authorize(["SUPERADMIN"]));

router.get("/mahasiswa", getMahasiswa); // Tampilkan user dengan role MAHASISWA
router.get("/pimpinan-fakultas", getPimpinanFakultas);
router.get("/pimpinan-ditmawa", getPimpinanDitmawa);
router.get("/verifikator", getVerifikator);
router.post("/", validateRegister, addPimpinanVerifikator); // Tambahkan user baru
router.post("/mahasiswa", validateRegister, addMahasiswa); // Tambahkan mahasiswa baru
router.post("/pimpinan-fakultas", validateRegister, addPimpinanFakultas); // Tambahkan pimpinan fakultas baru

router.put("/:id", updateUser); // Edit user
router.delete("/:id", deactivateUser); // Nonaktifkan user
router.patch("/activate/:id", activateUser); // Aktifkan user

module.exports = router;
