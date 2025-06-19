const axios = require("axios");
const logger = require("../utils/logger");
const cacheService = require("./cacheService");

class GeocodingService {
  async geocode(locationName) {
    const cacheKey = `geocode_${locationName
      .toLowerCase()
      .replace(/\s+/g, "_")}`;

    try {
      // Check cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info("Geocoding cache hit", { locationName });
        return cached;
      }

      let coordinates = null;

      // Try Google Maps API first
      if (process.env.GOOGLE_MAPS_API_KEY) {
        coordinates = await this.geocodeWithGoogle(locationName);
      }

      // Fallback to OpenStreetMap Nominatim
      if (!coordinates) {
        coordinates = await this.geocodeWithNominatim(locationName);
      }

      if (coordinates) {
        // Cache the result
        await cacheService.set(cacheKey, coordinates);
        logger.info("Geocoding successful", { locationName, coordinates });
      }

      return coordinates;
    } catch (error) {
      logger.error("Geocoding failed", { error: error.message, locationName });
      return null;
    }
  }

  async geocodeWithGoogle(locationName) {
    try {
      const response = await axios.get(
        "https://maps.googleapis.com/maps/api/geocode/json",
        {
          params: {
            address: locationName,
            key: process.env.GOOGLE_MAPS_API_KEY,
          },
        }
      );

      if (response.data.results.length > 0) {
        const { lat, lng } = response.data.results[0].geometry.location;
        return { lat, lng };
      }
    } catch (error) {
      logger.error("Google geocoding failed", { error: error.message });
    }
    return null;
  }

  async geocodeWithNominatim(locationName) {
    try {
      const response = await axios.get(
        "https://nominatim.openstreetmap.org/search",
        {
          params: {
            q: locationName,
            format: "json",
            limit: 1,
          },
          headers: {
            "User-Agent": "DisasterResponsePlatform/1.0",
          },
        }
      );

      if (response.data.length > 0) {
        const { lat, lon } = response.data[0];
        return { lat: parseFloat(lat), lng: parseFloat(lon) };
      }
    } catch (error) {
      logger.error("Nominatim geocoding failed", { error: error.message });
    }
    return null;
  }
}

module.exports = new GeocodingService();
