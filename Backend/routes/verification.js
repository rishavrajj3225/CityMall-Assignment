const express = require("express");
const router = express.Router();
const geminiService = require("../services/geminiService");
const { authenticateUser } = require("../middleware/auth");
const logger = require("../utils/logger");

router.use(authenticateUser);

/**
 * POST /verification/image
 * Body: { image_url: string, context?: string }
 * Returns: { status: string, message: string }
 */
router.post("/image", async (req, res, next) => {
  try {
    const { image_url, context = "" } = req.body;

    if (!image_url) {
      return res.status(400).json({ error: "image_url is required" });
    }

    const result = await geminiService.verifyImage(image_url, context);

    logger.info("Image verification completed", {
      user: req.user.id,
      image_url,
      result,
    });

    res.json({
      status: result.split(" ")[0],
      message: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /verification/location
 * Body: { description: string }
 * Returns: { locations: string }
 */
router.post("/location", async (req, res, next) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ error: "description is required" });
    }

    const locations = await geminiService.extractLocation(description);

    logger.info("Location extraction completed", {
      user: req.user.id,
      description,
      locations,
    });

    res.json({ locations });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
