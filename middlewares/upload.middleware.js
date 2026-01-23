const multer = require("multer");
const path = require("path");
const {
  getUploadDirectory,
  getFileInfo,
  getValidCategory,
} = require("../utils/upload");

/**
 * Membuat storage multer dengan kategori yang fleksibel
 * @param {string} category - Kategori upload (news, articles, application, dll)
 * @returns {multer.StorageEngine}
 */
const createStorage = (category = "general") => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const validCategory = getValidCategory(category);
      const userId = req.user?.id || "unknown";
      const uploadDir = getUploadDirectory(
        validCategory,
        file.mimetype,
        userId,
      );
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const fileExt = path.extname(file.originalname);
      const filename = `${uniqueSuffix}${fileExt}`;
      cb(null, filename);
    },
  });
};

/**
 * File filter untuk gambar
 */
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(
      new Error("Hanya file gambar (JPG, PNG, GIF, WEBP) yang diperbolehkan."),
    );
  }
};

/**
 * File filter khusus untuk Excel (TAMBAHAN)
 */
const excelFilter = (req, file, cb) => {
  const allowedTypes = /xlsx|xls|csv/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype =
    file.mimetype === "application/vnd.ms-excel" ||
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.mimetype === "text/csv";

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Hanya file Excel (XLSX, XLS, CSV) yang diperbolehkan."));
  }
};

/**
 * File filter untuk dokumen
 */
const documentFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype =
    /application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)/.test(
      file.mimetype,
    );

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Hanya file dokumen (PDF, DOC, DOCX) yang diperbolehkan."));
  }
};

/**
 * File filter untuk gambar dan dokumen
 */
const mixedFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedDocTypes = /pdf|doc|docx/;

  const extname =
    allowedImageTypes.test(path.extname(file.originalname).toLowerCase()) ||
    allowedDocTypes.test(path.extname(file.originalname).toLowerCase());

  const mimetype =
    file.mimetype.startsWith("image/") ||
    /application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)/.test(
      file.mimetype,
    );

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Hanya file gambar atau dokumen yang diperbolehkan."));
  }
};

/**
 * Middleware untuk mengatur fileInfo setelah upload
 */
const setFileInfo = (req, res, next) => {
  if (req.file) {
    req.fileInfo = getFileInfo(req.file);
  }
  if (req.files) {
    req.filesInfo = Array.isArray(req.files)
      ? req.files.map((file) => getFileInfo(file))
      : Object.keys(req.files).reduce((acc, key) => {
          acc[key] = Array.isArray(req.files[key])
            ? req.files[key].map((file) => getFileInfo(file))
            : getFileInfo(req.files[key]);
          return acc;
        }, {});
  }
  next();
};

/**
 * Membuat upload middleware dengan konfigurasi fleksibel
 * @param {object} options - Konfigurasi upload
 * @param {string} options.category - Kategori upload
 * @param {string} options.fileType - Tipe file ('image', 'document', 'mixed')
 * @param {number} options.maxSize - Ukuran maksimal file dalam bytes
 * @returns {object} - Upload middleware
 */
const createUploadMiddleware = (options = {}) => {
  const {
    category = "general",
    fileType = "mixed",
    maxSize = 10 * 1024 * 1024,
  } = options;

  let fileFilter;
  switch (fileType) {
    case "image":
      fileFilter = imageFilter;
      break;
    case "document":
      fileFilter = documentFilter;
      break;
    case "excel":
      fileFilter = excelFilter;
      break;
    default:
      fileFilter = mixedFilter;
  }

  const upload = multer({
    storage: createStorage(category),
    fileFilter,
    limits: { fileSize: maxSize },
  });

  return {
    single: (fieldName) => [upload.single(fieldName), setFileInfo],
    multiple: (fieldName, maxCount = 10) => [
      upload.array(fieldName, maxCount),
      setFileInfo,
    ],
    fields: (fields) => [upload.fields(fields), setFileInfo],
    any: () => [upload.any(), setFileInfo],
  };
};

module.exports = {
  newsUpload: createUploadMiddleware({
    category: "news",
    fileType: "image",
    maxSize: 5 * 1024 * 1024,
  }),

  articleUpload: createUploadMiddleware({
    category: "articles",
    fileType: "image",
    maxSize: 5 * 1024 * 1024,
  }),

  applicationUpload: createUploadMiddleware({
    category: "applications",
    fileType: "mixed",
    maxSize: 10 * 1024 * 1024,
  }),

  excelUpload: createUploadMiddleware({
    category: "scholarships",
    fileType: "excel",
    maxSize: 10 * 1024 * 1024,
  }),

  generalUpload: createUploadMiddleware({
    category: "general",
    fileType: "mixed",
    maxSize: 10 * 1024 * 1024,
  }),

  createUploadMiddleware,

  upload: createUploadMiddleware(),
};
