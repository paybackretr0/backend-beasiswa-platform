const multer = require("multer");
const path = require("path");
const uploadUtils = require("../utils/upload");

/**
 * Konfigurasi storage multer dengan direktori yang dinamis berdasarkan kategori file
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Menentukan kategori file dari parameter request atau dari URL
    let category = 'evidence';
    
    if (req.body && req.body.fileCategory) {
      category = req.body.fileCategory;
    } else if (req.originalUrl && req.originalUrl.includes('complete')) {
      category = 'handling';
    }
    
    // Log untuk debugging
    console.log(`Upload file: Category=${category}, URL=${req.originalUrl}, MimeType=${file.mimetype}`);
    
    // Dapatkan direktori upload yang sesuai berdasarkan kategori dan jenis file
    const uploadDir = uploadUtils.getUploadDirectory(category, file.mimetype);
    
    console.log(`Upload directory: ${uploadDir}`);
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Membuat nama file yang unik dengan timestamp + nama asli
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(file.originalname);
    const filename = `${uniqueSuffix}${fileExt}`;
    
    console.log(`Generated filename: ${filename}`);
    
    cb(null, filename);
  },
});

/**
 * Filter file untuk jenis yang diizinkan
 */
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb("Error: Jenis file tidak didukung. Hanya JPG, PNG, dan PDF yang diperbolehkan.");
  }
};

/**
 * Middleware upload untuk evidence (bukti laporan)
 */
const uploadEvidence = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single("evidence_files");

/**
 * Middleware upload untuk handling proof (bukti penanganan)
 */
const uploadHandlingProof = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single("handling_proof");

/**
 * Middleware upload generik (untuk keperluan lain)
 */
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/**
 * Wrapper untuk menangani error dari multer
 */
const handleUpload = (uploadMiddleware) => {
  return (req, res, next) => {
    console.log(`Processing ${req.originalUrl} with upload middleware`);
    
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // Error dari multer
        console.error(`Multer error: ${err.code} - ${err.message}`);
        
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            message: "Ukuran file terlalu besar. Maksimal 10MB."
          });
        }
        return res.status(400).json({ message: err.message });
      } else if (err) {
        // Error lainnya
        console.error(`Upload error: ${err}`);
        return res.status(400).json({ message: err });
      }
      
      // Jika berhasil, tambahkan fileInfo ke request untuk digunakan controller
      if (req.file) {
        console.log(`File uploaded successfully: ${req.file.path}`);
        req.fileInfo = uploadUtils.getFileInfo(req.file);
      } else {
        console.log('No file uploaded');
      }
      
      next();
    });
  };
};

module.exports = {
  upload,
  uploadEvidence: handleUpload(uploadEvidence),
  uploadHandlingProof: handleUpload(uploadHandlingProof)
};