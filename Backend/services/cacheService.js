const supabase = require("../config/database");
const logger = require("../utils/logger");
const { CACHE_TTL } = require("../config/constants");

class CacheService {
  async get(key) {
    try {
      const { data, error } = await supabase
        .from("cache")
        .select("value, expires_at")
        .eq("key", key)
        .single();

      if (error || !data) {
        return null;
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        await this.delete(key);
        return null;
      }

      return data.value;
    } catch (error) {
      logger.error("Cache get failed", { error: error.message, key });
      return null;
    }
  }

  async set(key, value, ttlSeconds = CACHE_TTL) {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

      const { error } = await supabase.from("cache").upsert({
        key,
        value,
        expires_at: expiresAt.toISOString(),
      });

      if (error) {
        logger.error("Cache set failed", { error: error.message, key });
        return false;
      }

      return true;
    } catch (error) {
      logger.error("Cache set failed", { error: error.message, key });
      return false;
    }
  }

  async delete(key) {
    try {
      await supabase.from("cache").delete().eq("key", key);
    } catch (error) {
      logger.error("Cache delete failed", { error: error.message, key });
    }
  }

  async cleanup() {
    try {
      await supabase
        .from("cache")
        .delete()
        .lt("expires_at", new Date().toISOString());

      logger.info("Cache cleanup completed");
    } catch (error) {
      logger.error("Cache cleanup failed", { error: error.message });
    }
  }
}

module.exports = new CacheService();
