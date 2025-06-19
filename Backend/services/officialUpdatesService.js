const logger = require("../utils/logger");
const { DISASTER_TAGS } = require("../config/constants");

class OfficialUpdatesService {
  constructor() {
    this.agencies = ["NDMA India", "UN OCHA", "FEMA", "WHO", "Red Cross"];
  }

  /**
   * Get official updates for a disaster
   * @param {string} disasterId
   * @param {Array<string>} tags
   * @returns {Array<{ agency: string, update: string, timestamp: string }>}
   */
  async getUpdates(disasterId, tags = []) {
    try {
      const now = new Date();
      const relevantTags = tags.length ? tags : DISASTER_TAGS.slice(0, 3);
      const updates = [];

      for (let i = 0; i < relevantTags.length; i++) {
        const tag = relevantTags[i];
        const agency = this.agencies[i % this.agencies.length];
        const message = this._generateUpdateMessage(tag);

        updates.push({
          agency,
          update: `${message} [Ref: ${disasterId}]`,
          timestamp: new Date(now.getTime() - i * 3600000).toISOString(), // staggered times
        });
      }

      logger.info("Official updates generated", {
        disasterId,
        count: updates.length,
      });
      return updates;
    } catch (error) {
      logger.error("Failed to fetch official updates", {
        error: error.message,
        disasterId,
      });
      return [];
    }
  }

  _generateUpdateMessage(tag) {
    const templates = {
      flood: "Evacuation efforts are underway in flood-affected regions.",
      earthquake: "Aftershocks expected, public advised to stay alert.",
      fire: "Firefighting teams have contained 80% of the blaze.",
      medical: "Mobile clinics deployed to handle medical emergencies.",
      shelter: "Temporary shelters established at key locations.",
      default: "Authorities are monitoring the situation closely.",
    };

    return templates[tag] || templates.default;
  }
}

module.exports = new OfficialUpdatesService();
