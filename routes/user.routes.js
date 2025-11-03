const express = require("express");
const router = express.Router();
const {
  authenticate,
  verifiedUser,
} = require("../middlewares/auth.middleware");
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

router.use(authenticate, verifiedUser, authorize(["SUPERADMIN"]));

router.get("/mahasiswa", getMahasiswa);
router.get("/pimpinan-fakultas", getPimpinanFakultas);
router.get("/pimpinan-ditmawa", getPimpinanDitmawa);
router.get("/verifikator", getVerifikator);
router.post("/", validateRegister, addPimpinanVerifikator);
router.post("/mahasiswa", validateRegister, addMahasiswa);
router.post("/pimpinan-fakultas", validateRegister, addPimpinanFakultas);

router.put("/:id", updateUser);
router.delete("/:id", deactivateUser);
router.patch("/activate/:id", activateUser);

module.exports = router;
