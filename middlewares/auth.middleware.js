const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { errorResponse } = require("../utils/response");

const verifiedUser = async (req, res, next) => {
  const user = await User.findByPk(req.user.id);
  if (!user || !user.emailVerified || !user.is_active) {
    return errorResponse(
      res,
      "Email belum diverifikasi atau user tidak aktif",
      403,
    );
  }
  req.user = user;
  next();
};

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return errorResponse(res, "Access denied. No token provided.", 401);
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
        return errorResponse(res, "Token expired. Please login again.", 401);
      }
      return errorResponse(res, "Invalid token.", 401);
    }
  } catch (error) {
    console.error("Authentication error:", error);
    return errorResponse(res, "Server error during authentication.", 500);
  }
};

module.exports = {
  authenticate,
  verifiedUser,
};
