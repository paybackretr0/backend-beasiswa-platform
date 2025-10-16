/**
 * Utilitas untuk penanganan upload file
 */
const path = require("path");
const fs = require("fs");

/**
 * Memeriksa apakah file adalah gambar
 * @param {string} mimeType - MIME type file
 * @returns {boolean} - true jika file adalah gambar
 */
const isImage = (mimeType) => {
  return mimeType.startsWith("image/");
};

/**
 * Memeriksa apakah file adalah dokumen
 * @param {string} mimeType - MIME type file
 * @returns {boolean} - true jika file adalah dokumen
 */
const isDocument = (mimeType) => {
  return (
    mimeType === "application/pdf" ||
    mimeType === "application/msword" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
};

/**
 * Menentukan direktori penyimpanan untuk file dengan kategori yang fleksibel
 * @param {string} category - Kategori file (bebas, contoh: 'news', 'articles', 'evidence', 'profiles', dll)
 * @param {string} mimeType - MIME type file
 * @returns {string} - Path direktori penyimpanan
 */
const getUploadDirectory = (category = "general", mimeType, userId = null) => {
  // Bersihkan nama kategori
  const cleanCategory = category
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // Tentukan subfolder berdasarkan jenis file
  const subDir = isImage(mimeType) ? "images" : "documents";

  // Gabungkan path: uploads/applications/<IDUSERPENDAFTAR>/images atau documents
  const userFolder = userId ? `applications/${userId}` : cleanCategory;
  const uploadDir = path.join("uploads", userFolder, subDir);

  // Pastikan direktori ada
  ensureDirectoryExists(uploadDir);

  return uploadDir;
};

/**
 * Memastikan direktori ada, jika tidak, buat direktori tersebut
 * @param {string} directory - Path direktori
 */
const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

/**
 * Mendapatkan URL untuk mengakses file
 * @param {string} filePath - Path file di server
 * @returns {string} - URL untuk mengakses file
 */
const getFileUrl = (filePath) => {
  if (!filePath) return null;

  // Ubah backslash ke forward slash untuk URL
  const normalizedPath = filePath.replace(/\\/g, "/");

  // Return path lengkap untuk URL
  return normalizedPath;
};

/**
 * Mendapatkan informasi file (jenis, URL, dll)
 * @param {object} file - Objek file dari multer
 * @returns {object} - Informasi file
 */
const getFileInfo = (file) => {
  if (!file) return null;

  return {
    originalName: file.originalname,
    filename: file.filename,
    path: file.path,
    size: file.size,
    mimeType: file.mimetype,
    url: getFileUrl(file.path),
    fileType: isImage(file.mimetype) ? "image" : "document",
  };
};

/**
 * Konfigurasi kategori upload yang tersedia
 * Bisa ditambah sesuai kebutuhan
 */
const UPLOAD_CATEGORIES = {
  NEWS: "news",
  ARTICLES: "articles",
  APPLICATIONS: "applications",
  PROFILES: "profiles",
  SCHOLARSHIPS: "scholarships",
  GENERAL: "general",
};

/**
 * Mendapatkan kategori upload yang valid
 * @param {string} category - Kategori yang diminta
 * @returns {string} - Kategori yang valid atau default 'general'
 */
const getValidCategory = (category) => {
  if (!category) return UPLOAD_CATEGORIES.GENERAL;

  // Cek apakah kategori ada di daftar yang sudah ditentukan
  const upperCategory = category.toUpperCase();
  if (UPLOAD_CATEGORIES[upperCategory]) {
    return UPLOAD_CATEGORIES[upperCategory];
  }

  // Jika tidak ada, bersihkan dan gunakan sebagai kategori custom
  return category
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

module.exports = {
  isImage,
  isDocument,
  getUploadDirectory,
  ensureDirectoryExists,
  getFileUrl,
  getFileInfo,
  getValidCategory,
  UPLOAD_CATEGORIES,
};
