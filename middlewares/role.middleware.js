/**
 * Middleware untuk otorisasi berdasarkan role
 * @param {Array|String} allowedRoles - Role yang diizinkan untuk mengakses route
 * @returns {Function} - Middleware function
 */
const authorize = (allowedRoles) => {
  // Konversi ke array jika input berupa string
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    // Pastikan user sudah autentikasi
    if (!req.user) {
      return res.status(401).json({ message: "User tidak terautentikasi" });
    }
    
    // Pastikan user memiliki property role
    if (!req.user.role) {
      return res.status(403).json({ message: "Akses ditolak: User tidak memiliki role" });
    }
    
    // Cek apakah role user termasuk dalam roles yang diizinkan
    if (roles.includes(req.user.role)) {
      return next();
    }
    
    // User tidak memiliki role yang diizinkan
    console.log(`Akses ditolak: User dengan role ${req.user.role} mencoba mengakses route yang memerlukan role ${roles.join(', ')}`);
    return res.status(403).json({ message: "Akses ditolak: Anda tidak memiliki izin untuk mengakses resource ini" });
  };
};

module.exports = authorize;