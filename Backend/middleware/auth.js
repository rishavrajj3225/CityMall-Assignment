const { MOCK_USERS } = require("../config/constants");

const authenticateUser = (req, res, next) => {
  const userId = req.headers["x-user-id"] || "netrunnerX"; // Default for testing
  const user = MOCK_USERS[userId];

  if (!user) {
    return res.status(401).json({ error: "Invalid user" });
  }

  req.user = user;
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

module.exports = { authenticateUser, requireAdmin };

