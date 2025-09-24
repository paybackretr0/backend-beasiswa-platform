const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const {
  validateRegister,
  validateLogin,
} = require("../validators/auth.validator");
const {
  authenticate: auth,
  verifiedUser,
} = require("../middlewares/auth.middleware");

// ==== Rute publik (tidak memerlukan autentikasi) ====

// Registrasi pengguna
router.post("/register", validateRegister, authController.register);

// Login
router.post("/login", validateLogin, authController.login);

router.post("/verify-email", authController.verifyEmail);

router.post("/forgot-password", verifiedUser, authController.forgotPassword);
router.post("/verify-reset-code", verifiedUser, authController.verifyResetCode);
router.post("/reset-password", verifiedUser, authController.resetPassword);

// // Refresh token
router.post("/token", authController.getToken);

// // ==== Rute terproteksi (memerlukan autentikasi) ====

// // Update profil
router.put("/profile", auth, verifiedUser, authController.updateProfile);

// // Update password
router.put("/password", auth, verifiedUser, authController.updatePassword);

// Logout
router.post("/logout", auth, authController.logout);

// // Get profile
router.get("/profile", auth, verifiedUser, authController.getProfile);

module.exports = router;
