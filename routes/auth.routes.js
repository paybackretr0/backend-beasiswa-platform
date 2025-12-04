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

router.post("/register", validateRegister, authController.register);
router.post("/login", validateLogin, authController.login);
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-verification-code", authController.resendVerificationCode);

router.post("/forgot-password", authController.forgotPassword);
router.post("/verify-reset-code", authController.verifyResetCode);
router.post("/reset-password", authController.resetPassword);

router.post("/token", authController.getToken);
router.get("/basic-profile", auth, authController.getBasicProfile);

router.put("/profile", auth, verifiedUser, authController.updateProfile);
router.put("/password", auth, verifiedUser, authController.updatePassword);
router.post("/logout", auth, authController.logout);
router.get("/profile", auth, verifiedUser, authController.getProfile);

module.exports = router;
