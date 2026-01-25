const {
  invalidateApplicationCaches,
  invalidateGovernmentScholarshipCaches,
  invalidateCacheByPattern,
  invalidateUserCaches,
  invalidateInformationCaches,
  invalidateCommentTemplateCaches,
} = require("../utils/cacheHelper");

/**
 * Invalidate semua cache yang berhubungan dengan beasiswa
 */
const invalidateScholarshipCache = async (req, res, next) => {
  try {
    await Promise.all([
      invalidateCacheByPattern("all_scholarships"),
      invalidateCacheByPattern("active_scholarships_info"),
      invalidateCacheByPattern("applications_summary:*"),
    ]);
  } catch (err) {
    console.error("Scholarship cache invalidate error:", err);
  }
  next(); // WAJIB
};

/**
 * Invalidate cache aplikasi (summary, chart, dsb)
 */
const invalidateApplicationCache = async (req, res, next) => {
  try {
    await invalidateApplicationCaches();
  } catch (err) {
    console.error("Application cache invalidate error:", err);
  }
  next();
};

/**
 * Invalidate cache government scholarship
 */
const invalidateGovScholarshipCache = async (req, res, next) => {
  try {
    await invalidateGovernmentScholarshipCaches();
  } catch (err) {
    console.error("Gov scholarship cache invalidate error:", err);
  }
  next();
};

/**
 * Invalidate cache user (mahasiswa, verifikator, pimpinan, dll)
 */
const invalidateUserCache = async (req, res, next) => {
  try {
    await invalidateUserCaches();
  } catch (err) {
    console.error("User cache invalidate error:", err);
  }
  next(); // WAJIB
};

/**
 * Invalidate cache informasi (berita, artikel, dsb)
 */
const invalidateInformationCache = async (req, res, next) => {
  try {
    await invalidateInformationCaches();
  } catch (err) {
    console.error("Information cache invalidate error:", err);
  }
  next(); // WAJIB
};

/**
 * Invalidate cache template komentar
 */
const invalidateCommentTemplateCache = async (req, res, next) => {
  try {
    await invalidateCommentTemplateCaches();
  } catch (err) {
    console.error("Comment template cache invalidate error:", err);
  }
  next(); // WAJIB
};

module.exports = {
  invalidateScholarshipCache,
  invalidateApplicationCache,
  invalidateGovScholarshipCache,
  invalidateUserCache,
  invalidateInformationCache,
  invalidateCommentTemplateCache,
};
