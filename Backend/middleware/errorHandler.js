const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  logger.error("Error occurred:", {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  if (err.name === "ValidationError") {
    return res.status(400).json({ error: err.message });
  }

  if (err.code === "PGRST116") {
    return res.status(404).json({ error: "Resource not found" });
  }

  res.status(500).json({ error: "Internal server error" });
};

module.exports = errorHandler;
