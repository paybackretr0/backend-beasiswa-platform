const redis = require("../config/redis");

/**
 * Ambil data dari cache, kalau tidak ada -> ambil dari DB lalu simpan ke cache
 * @param {string} key - cache key
 * @param {number} ttl - waktu hidup cache (detik)
 * @param {Function} callback - fungsi async pengambil data (DB)
 */
const getOrSetCache = async (key, ttl, callback) => {
  try {
    const cached = await redis.get(key);
    if (cached) {
      console.log("⚡ FROM REDIS:", key);
      return JSON.parse(cached);
    }

    console.log("🐢 FROM DATABASE:", key);
    const freshData = await callback();

    await redis.set(key, JSON.stringify(freshData), "EX", ttl);
    return freshData;
  } catch (error) {
    console.error("Redis helper error:", error);
    return await callback();
  }
};

/**
 * Hapus cache berdasarkan pattern (DEV / controlled use)
 */
const invalidateCacheByPattern = async (pattern) => {
  let cursor = "0";
  let deleted = 0;

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      100,
    );

    cursor = nextCursor;

    if (keys.length > 0) {
      await redis.del(keys);
      deleted += keys.length;
    }
  } while (cursor !== "0");

  console.log(`🧹 Cache invalidated: ${pattern} (${deleted} keys)`);
  return deleted;
};

/**
 * Hapus cache yang terkait dengan data aplikasi beasiswa
 */
const invalidateApplicationCaches = async () => {
  try {
    await Promise.all([
      invalidateCacheByPattern("summary:*"),
      invalidateCacheByPattern("monthly_trend:*"),
      invalidateCacheByPattern("yearly_trend:*"),
      invalidateCacheByPattern("status_summary:*"),
      invalidateCacheByPattern("gender_distribution:*"),
      invalidateCacheByPattern("faculty_distribution:*"),
      invalidateCacheByPattern("department_distribution:*"),
      invalidateCacheByPattern("scholarship_performance:*"),
      invalidateCacheByPattern("top_performing_faculties:*"),
      redis.del("recent_activities"),
      redis.del("all_scholarships"),
      redis.del("active_scholarships_info"),
    ]);
  } catch (err) {
    console.error("Cache invalidate error:", err);
  }
};

/* Invalidate for Government Scholarships */
const invalidateGovernmentScholarshipCaches = async () => {
  try {
    await Promise.all([
      invalidateCacheByPattern("gov_summary:*"),
      invalidateCacheByPattern("gov_distribution:*"),
      invalidateCacheByPattern("gov_category:*"),
    ]);
  } catch (err) {
    console.error("Cache invalidate error:", err);
  }
};

/* Invalidate for User / Account */
const invalidateUserCaches = async () => {
  try {
    await Promise.all([invalidateCacheByPattern("users:*")]);
  } catch (err) {
    console.error("User cache invalidate error:", err);
  }
};

/**
 * Invalidate Information Caches
 */
const invalidateInformationCaches = async () => {
  await Promise.all([
    invalidateCacheByPattern("latest_informations"),
    invalidateCacheByPattern("public_informations"),
    invalidateCacheByPattern("information_slug:*"),
    invalidateCacheByPattern("admin_news"),
    invalidateCacheByPattern("admin_articles"),
  ]);
};

/**
 * Invalidate Comment Template Caches
 */
const invalidateCommentTemplateCaches = async () => {
  await invalidateCacheByPattern("comment_templates:*");
};

module.exports = {
  getOrSetCache,
  invalidateCacheByPattern,
  invalidateApplicationCaches,
  invalidateGovernmentScholarshipCaches,
  invalidateUserCaches,
  invalidateInformationCaches,
  invalidateCommentTemplateCaches,
};
