const jwt = require("jsonwebtoken");

const generateAccessToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
};

const generateRefreshToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
  };
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
};

const generateResetToken = (user) => {
  return jwt.sign({ id: user.id }, process.env.JWT_RESET_PASSWORD_SECRET, {
    expiresIn: "1h",
  });
};

const verifyResetPasswordToken = (token) => {
  return jwt.verify(token, process.env.JWT_RESET_PASSWORD_SECRET);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  verifyResetPasswordToken,
};
