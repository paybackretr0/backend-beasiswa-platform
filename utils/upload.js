/**
 * Utilitas untuk penanganan upload file
 */
const path = require('path');
const fs = require('fs');

/**
 * Memeriksa apakah file adalah gambar
 * @param {string} mimeType - MIME type file
 * @returns {boolean} - true jika file adalah gambar
 */
const isImage = (mimeType) => {
  return mimeType.startsWith('image/');
};

/**
 * Memeriksa apakah file adalah dokumen
 * @param {string} mimeType - MIME type file
 * @returns {boolean} - true jika file adalah dokumen
 */
const isDocument = (mimeType) => {
  return mimeType === 'application/pdf';
};

/**
 * Menentukan direktori penyimpanan untuk file
 * @param {string} category - Kategori file ('evidence' atau 'handling')
 * @param {string} mimeType - MIME type file
 * @returns {string} - Path direktori penyimpanan
 */
const getUploadDirectory = (category, mimeType) => {
  // Tentukan kategori folder (evidence atau handling)
  const categoryDir = ['evidence', 'handling'].includes(category) 
    ? category 
    : 'evidence'; // Default ke evidence jika kategori tidak valid
  
  // Tentukan subfolder berdasarkan jenis file
  const subDir = isImage(mimeType) ? 'images' : 'documents';
  
  // Gabungkan path
  const uploadDir = path.join('uploads', categoryDir, subDir);
  
  // Pastikan direktori ada
  ensureDirectoryExists(uploadDir);
  
  return uploadDir;
};

/**
 * Memastikan direktori ada, jika tidak, buat direktori tersebut
 * @param {string} directory - Path direktori
 */
const ensureDirectoryExists = (directory) => {
  // Membuat direktori secara rekursif jika tidak ada
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
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  // Jika path dimulai dengan 'uploads/', hapus untuk membuat URL relatif
  return normalizedPath.startsWith('uploads/') 
    ? normalizedPath 
    : `uploads/${normalizedPath}`;
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
    fileType: isImage(file.mimetype) ? 'image' : 'document'
  };
};

module.exports = {
  isImage,
  isDocument,
  getUploadDirectory,
  ensureDirectoryExists,
  getFileUrl,
  getFileInfo
};