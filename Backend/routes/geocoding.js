const express = require("express");
const router = express.Router();
const geocodingService = require("../services/geocodingService");
const { authenticateUser } = require("../middleware/auth");
const logger = require("../utils/logger");

router.use(authenticateUser);

/**
 * GET /geocoding?location_name=Manhattan, NYC
 * Returns: { lat: number, lng: number } or { error }
 */
router.get("/", async (req, res, next) => {
  try {
    const { location_name } = req.query;

    if (!location_name) {
      return res
        .status(400)
        .json({ error: "location_name query parameter is required" });
    }

    const coords = await geocodingService.geocode(location_name);

    if (!coords) {
      logger.warn("Geocoding failed or returned null", { location_name });
      return res
        .status(404)
        .json({
          error: "Could not resolve coordinates for the given location",
        });
    }

    logger.info("Geocoding result", { location_name, coords });
    res.json(coords);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
