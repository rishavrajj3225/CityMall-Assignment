const express = require("express");
const router = express.Router();
const supabase = require("../config/database");
const { authenticateUser } = require("../middleware/auth");
const logger = require("../utils/logger");
const geminiService = require("../services/geminiService");
const geocodingService = require("../services/geocodingService");
const { v4: uuidv4 } = require("uuid");

router.use(authenticateUser);

// GET /disasters
router.get("/", async (req, res, next) => {
  try {
    const { tag, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from("disasters")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (tag) {
      query = query.contains("tags", [tag]);
    }

    const { data, error } = await query;

    if (error) throw error;

    logger.info("Disasters retrieved", {
      count: data.length,
      user: req.user.id,
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// POST /disasters
router.post("/", async (req, res, next) => {
  try {
    const { title, location_name, description, tags = [] } = req.body;

    if (!title || !description) {
      return res
        .status(400)
        .json({ error: "Title and description are required" });
    }

    // Extract location if not provided
    let finalLocationName = location_name;
    if (!finalLocationName && description) {
      finalLocationName = await geminiService.extractLocation(description);
    }

    // Geocode location
    let location = null;
    if (finalLocationName && finalLocationName !== "unknown") {
      const coords = await geocodingService.geocode(finalLocationName);
      if (coords) {
        location = `POINT(${coords.lng} ${coords.lat})`;
      }
    }

    const disaster = {
      id: uuidv4(),
      title,
      location_name: finalLocationName,
      location,
      description,
      tags,
      owner_id: req.user.id,
      created_at: new Date().toISOString(),
      audit_trail: [
        {
          action: "create",
          user_id: req.user.id,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const { data, error } = await supabase
      .from("disasters")
      .insert(disaster)
      .select()
      .single();

    if (error) throw error;

    // Emit real-time update
    const io = req.app.get("socketio");
    io.emit("disaster_updated", { action: "create", data });

    logger.info("Disaster created", { id: data.id, user: req.user.id });
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

// PUT /disasters/:id
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, location_name, description, tags } = req.body;

    // Get existing disaster
    const { data: existing, error: fetchError } = await supabase
      .from("disasters")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    // Check ownership or admin
    if (existing.owner_id !== req.user.id && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Not authorized to update this disaster" });
    }

    // Update audit trail
    const updatedAuditTrail = [
      ...existing.audit_trail,
      {
        action: "update",
        user_id: req.user.id,
        timestamp: new Date().toISOString(),
      },
    ];

    const updates = {
      title: title || existing.title,
      location_name: location_name || existing.location_name,
      description: description || existing.description,
      tags: tags || existing.tags,
      audit_trail: updatedAuditTrail,
    };

    const { data, error } = await supabase
      .from("disasters")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Emit real-time update
    const io = req.app.get("socketio");
    io.emit("disaster_updated", { action: "update", data });

    logger.info("Disaster updated", { id, user: req.user.id });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// DELETE /disasters/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check ownership or admin
    const { data: existing, error: fetchError } = await supabase
      .from("disasters")
      .select("owner_id")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    if (existing.owner_id !== req.user.id && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this disaster" });
    }

    const { error } = await supabase.from("disasters").delete().eq("id", id);

    if (error) throw error;

    // Emit real-time update
    const io = req.app.get("socketio");
    io.emit("disaster_updated", { action: "delete", id });

    logger.info("Disaster deleted", { id, user: req.user.id });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// GET /disasters/:id/social-media
router.get("/:id/social-media", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Mock social media data for now
    const socialMediaData = [
      {
        post: `#disasterrelief Help needed for disaster ${id}`,
        user: "citizen1",
        timestamp: new Date().toISOString(),
      },
      {
        post: `Volunteer assistance available for ${id} #help`,
        user: "volunteer2",
        timestamp: new Date().toISOString(),
      },
    ];

    // Emit real-time update
    const io = req.app.get("socketio");
    io.emit("social_media_updated", { disaster_id: id, data: socialMediaData });

    logger.info("Social media data retrieved", { disaster_id: id });
    res.json(socialMediaData);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
