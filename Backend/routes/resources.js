const express = require("express");
const router = express.Router();
const supabase = require("../config/database");
const { authenticateUser } = require("../middleware/auth");
const logger = require("../utils/logger");
const { GEOSPATIAL_RADIUS } = require("../config/constants");

router.use(authenticateUser);

// GET /resources/:disaster_id/resources
router.get("/:disaster_id/resources", async (req, res, next) => {
  try {
    const { disaster_id } = req.params;
    const { lat, lon, radius = GEOSPATIAL_RADIUS } = req.query;

    let query = supabase
      .from("resources")
      .select("*")
      .eq("disaster_id", disaster_id);

    // If coordinates provided, filter by location
    if (lat && lon) {
      const point = `POINT(${lon} ${lat})`;
      const { data, error } = await supabase.rpc("get_nearby_resources", {
        disaster_id,
        center_point: point,
        radius_meters: parseInt(radius),
      });

      if (error) throw error;

      logger.info("Nearby resources retrieved", {
        disaster_id,
        lat,
        lon,
        radius,
        count: data.length,
      });

      return res.json(data);
    }

    const { data, error } = await query;

    if (error) throw error;

    logger.info("Resources retrieved", { disaster_id, count: data.length });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// POST /resources
router.post("/", async (req, res, next) => {
  try {
    const { disaster_id, name, location_name, type, lat, lon } = req.body;

    if (!disaster_id || !name || !type) {
      return res
        .status(400)
        .json({ error: "disaster_id, name, and type are required" });
    }

    let location = null;
    if (lat && lon) {
      location = `POINT(${lon} ${lat})`;
    }

    const resource = {
      disaster_id,
      name,
      location_name,
      location,
      type,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("resources")
      .insert(resource)
      .select()
      .single();

    if (error) throw error;

    // Emit real-time update
    const io = req.app.get("socketio");
    io.emit("resources_updated", { disaster_id, action: "create", data });

    logger.info("Resource created", {
      id: data.id,
      disaster_id,
      user: req.user.id,
    });
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
