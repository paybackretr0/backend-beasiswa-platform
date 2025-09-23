const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const {
  validateRegister,
  validateLogin,
} = require("../validators/auth.validator");
const auth = require("../middlewares/auth.middleware");

// ==== Rute publik (tidak memerlukan autentikasi) ====

// Registrasi pengguna
router.post("/register", validateRegister, authController.register);

// Login
router.post("/login", validateLogin, authController.login);

router.post("/verify-email", authController.verifyEmail);

router.post("/forgot-password", authController.forgotPassword);
router.post("/verify-reset-code", authController.verifyResetCode);
router.post("/reset-password", authController.resetPassword);

// // Refresh token
// router.post("/token", authController.getToken);

// // ==== Rute terproteksi (memerlukan autentikasi) ====

// // Update profil
// router.put("/profile", auth, authController.updateProfile);

// // Update password
// router.put("/password", auth, authController.updatePassword);

// Logout
router.post("/logout", auth, authController.logout);

// // Get profile
// router.get("/profile", auth, authController.getProfile);

module.exports = router;
