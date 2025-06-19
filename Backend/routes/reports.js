const express = require("express");
const router = express.Router();
const supabase = require("../config/database");
const { authenticateUser } = require("../middleware/auth");
const logger = require("../utils/logger");
const geminiService = require("../services/geminiService");
const { v4: uuidv4 } = require("uuid");

router.use(authenticateUser);

// GET /reports?disaster_id=xxx
router.get("/", async (req, res, next) => {
  try {
    const { disaster_id } = req.query;
    if (!disaster_id) {
      return res.status(400).json({ error: "disaster_id is required" });
    }

    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("disaster_id", disaster_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    logger.info("Reports fetched", { disaster_id, count: data.length });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// POST /reports
router.post("/", async (req, res, next) => {
  try {
    const { disaster_id, content, image_url } = req.body;

    if (!disaster_id || !content) {
      return res
        .status(400)
        .json({ error: "disaster_id and content are required" });
    }

    let verification_status = "pending";
    if (image_url) {
      const result = await geminiService.verifyImage(image_url, content);
      if (result.startsWith("VERIFIED")) verification_status = "verified";
      else if (result.startsWith("SUSPICIOUS")) verification_status = "pending";
      else verification_status = "rejected";
    }

    const report = {
      id: uuidv4(),
      disaster_id,
      user_id: req.user.id,
      content,
      image_url: image_url || null,
      verification_status,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("reports")
      .insert(report)
      .select()
      .single();

    if (error) throw error;

    // Emit real-time update
    const io = req.app.get("socketio");
    io.emit("reports_updated", { disaster_id, action: "create", data });

    logger.info("Report created", { id: data.id, disaster_id });
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

// PUT /reports/:id/verify
router.put("/:id/verify", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "verified", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid verification status" });
    }

    const { data: existing, error: fetchError } = await supabase
      .from("reports")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from("reports")
      .update({ verification_status: status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    const io = req.app.get("socketio");
    io.emit("reports_updated", {
      disaster_id: existing.disaster_id,
      action: "verify",
      data,
    });

    logger.info("Report verification updated", { id, status });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// DELETE /reports/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: report, error: fetchError } = await supabase
      .from("reports")
      .select("user_id, disaster_id")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    if (report.user_id !== req.user.id && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this report" });
    }

    const { error } = await supabase.from("reports").delete().eq("id", id);

    if (error) throw error;

    const io = req.app.get("socketio");
    io.emit("reports_updated", {
      disaster_id: report.disaster_id,
      action: "delete",
      id,
    });

    logger.info("Report deleted", { id, disaster_id: report.disaster_id });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
