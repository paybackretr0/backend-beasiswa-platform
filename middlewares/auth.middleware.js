const jwt = require("jsonwebtoken");
const { User } = require("../models");

const verifiedUser = async (req, res, next) => {
  const user = await User.findByPk(req.user.id);
  if (!user || !user.emailVerified) {
    return res.status(403).json({
      message: "Email belum diverifikasi, silakan lakukan verifikasi dahulu.",
    });
  }
  next();
};

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "")
      : authHeader;

    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ message: "Token expired. Please login again." });
      }
      return res.status(401).json({ message: "Invalid token." });
    }
  } catch (error) {
    console.error("Authentication error:", error);
    return res
      .status(500)
      .json({ message: "Server error during authentication." });
  }
};

module.exports = {
  authenticate,
  verifiedUser,
};
