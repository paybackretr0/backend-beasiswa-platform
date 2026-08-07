const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || null,
  lazyConnect: true,
  // Fail fast: without this, every command waits ~2s x retries (default 20)
  // when Redis is down, stalling API requests for seconds.
  maxRetriesPerRequest: 1,
  // Reject commands immediately when disconnected instead of queueing them.
  enableOfflineQueue: false,
  // Auto-reconnect with capped backoff (up to 3s), so caching resumes
  // automatically once Redis is back without spamming errors every second.
  retryStrategy: (times) => Math.min(times * 200, 3000),
});

redis.on("connect", () => {
  console.log("Redis connected");
});

redis.on("ready", () => {
  console.log("Redis ready");
});

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

module.exports = redis;
