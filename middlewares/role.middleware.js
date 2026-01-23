const { errorResponse } = require("../utils/response");
/**
 * Middleware untuk otorisasi berdasarkan role
 * @param {Array|String} allowedRoles - Role yang diizinkan untuk mengakses route
 * @returns {Function} - Middleware function
 */
const authorize = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, "User tidak terautentikasi", 401);
    }

    if (!req.user.role) {
      return errorResponse(res, "Akses ditolak: User tidak memiliki role", 403);
    }

    if (roles.includes(req.user.role)) {
      return next();
    }

    return errorResponse(
      res,
      "Akses ditolak: Anda tidak memiliki izin untuk mengakses resource ini",
      403,
    );
  };
};

module.exports = authorize;
