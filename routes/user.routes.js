const express = require("express");
const router = express.Router();
const {
  authenticate,
  verifiedUser,
} = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");
const {
  addUserDitmawa,
  addMahasiswa,
  addPimpinanFakultas,
  updateUser,
  deactivateUser,
  getMahasiswa,
  getPimpinanFakultas,
  getPimpinanDitmawa,
  getVerifikator,
  getValidator,
  activateUser,
  addVerifikator,
  updateVerifikator,
} = require("../controllers/user.controller");
const { validateRegister } = require("../validators/auth.validator");

router.use(authenticate, verifiedUser, authorize(["SUPERADMIN"]));

router.get("/mahasiswa", getMahasiswa);
router.get("/pimpinan-fakultas", getPimpinanFakultas);
router.get("/pimpinan-ditmawa", getPimpinanDitmawa);
router.get("/verifikator", getVerifikator);
router.get("/validator", getValidator);
router.post("/", validateRegister, addUserDitmawa);
router.post("/mahasiswa", validateRegister, addMahasiswa);
router.post("/pimpinan-fakultas", validateRegister, addPimpinanFakultas);
router.post("/verifikator", validateRegister, addVerifikator);

router.put("/:id", updateUser);
router.put("/verifikator/:id", updateVerifikator);
router.delete("/:id", deactivateUser);
router.patch("/activate/:id", activateUser);

module.exports = router;
