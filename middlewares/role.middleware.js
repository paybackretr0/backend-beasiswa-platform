/**
 * Middleware untuk otorisasi berdasarkan role
 * @param {Array|String} allowedRoles - Role yang diizinkan untuk mengakses route
 * @returns {Function} - Middleware function
 */
const authorize = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "User tidak terautentikasi" });
    }

    if (!req.user.role) {
      return res
        .status(403)
        .json({ message: "Akses ditolak: User tidak memiliki role" });
    }

    if (roles.includes(req.user.role)) {
      return next();
    }

    return res
      .status(403)
      .json({
        message:
          "Akses ditolak: Anda tidak memiliki izin untuk mengakses resource ini",
      });
  };
};

module.exports = authorize;
