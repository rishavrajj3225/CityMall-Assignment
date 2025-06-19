module.exports = {
  CACHE_TTL: 3600, // 1 hour in seconds
  GEOSPATIAL_RADIUS: 10000, // 10km in meters
  MOCK_USERS: {
    netrunnerX: { id: "netrunnerX", role: "admin" },
    reliefAdmin: { id: "reliefAdmin", role: "admin" },
    contributor1: { id: "contributor1", role: "contributor" },
  },
  DISASTER_TAGS: [
    "flood",
    "earthquake",
    "fire",
    "hurricane",
    "tornado",
    "urgent",
    "medical",
    "shelter",
  ],
  VERIFICATION_STATUS: ["pending", "verified", "rejected"],
};
