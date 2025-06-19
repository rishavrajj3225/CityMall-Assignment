const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("../utils/logger");
const cacheService = require("./cacheService");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class GeminiService {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-pro" });
  }

  async extractLocation(description) {
    const cacheKey = `location_extract_${Buffer.from(description).toString(
      "base64"
    )}`;

    try {
      // Check cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info("Location extraction cache hit");
        return cached;
      }

      const prompt = `Extract specific location names from this disaster description. Return only the location names, separated by commas. If no specific location is found, return "unknown". Description: "${description}"`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const locations = response.text().trim();

      // Cache the result
      await cacheService.set(cacheKey, locations);

      logger.info("Location extracted successfully", { locations });
      return locations;
    } catch (error) {
      logger.error("Location extraction failed", { error: error.message });
      return "unknown";
    }
  }

  async verifyImage(imageUrl, context = "") {
    const cacheKey = `image_verify_${Buffer.from(imageUrl).toString("base64")}`;

    try {
      // Check cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info("Image verification cache hit");
        return cached;
      }

      const prompt = `Analyze this image for disaster-related content and authenticity. Consider: 1) Is this a real disaster scene? 2) Are there signs of manipulation? 3) Does it match the context: "${context}"? Respond with: VERIFIED, SUSPICIOUS, or REJECTED followed by a brief explanation.`;

      // Note: For actual implementation, you'd need to handle image input
      // This is a simplified version for text-based analysis
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const verification = response.text().trim();

      // Cache the result
      await cacheService.set(cacheKey, verification);

      logger.info("Image verification completed", { imageUrl, verification });
      return verification;
    } catch (error) {
      logger.error("Image verification failed", { error: error.message });
      return "REJECTED - Verification service unavailable";
    }
  }
}

module.exports = new GeminiService();
