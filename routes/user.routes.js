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
const { invalidateUserCache } = require("../middlewares/cache.middleware");

router.use(authenticate, verifiedUser, authorize(["SUPERADMIN"]));

router.get("/mahasiswa", getMahasiswa);
router.get("/pimpinan-fakultas", getPimpinanFakultas);
router.get("/pimpinan-ditmawa", getPimpinanDitmawa);
router.get("/verifikator", getVerifikator);
router.get("/validator", getValidator);
router.post("/", invalidateUserCache, validateRegister, addUserDitmawa);
router.post("/mahasiswa", invalidateUserCache, validateRegister, addMahasiswa);
router.post(
  "/pimpinan-fakultas",
  invalidateUserCache,
  validateRegister,
  addPimpinanFakultas,
);
router.post(
  "/verifikator",
  invalidateUserCache,
  validateRegister,
  addVerifikator,
);

router.put("/:id", invalidateUserCache, updateUser);
router.put("/verifikator/:id", invalidateUserCache, updateVerifikator);
router.delete("/:id", invalidateUserCache, deactivateUser);
router.patch("/activate/:id", invalidateUserCache, activateUser);

module.exports = router;
