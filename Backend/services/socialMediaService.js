const logger = require("../utils/logger");
const { DISASTER_TAGS } = require("../config/constants");

class SocialMediaService {
  constructor() {
    this.mockUsers = [
      "citizenX",
      "helperBot",
      "rescueTeam",
      "volunteer99",
      "reliefAngel",
    ];
  }

  /**
   * Generate mock posts based on a disaster ID and optional tags
   * @param {string} disasterId
   * @param {Array<string>} tags
   * @returns {Array<{ post: string, user: string, timestamp: string }>}
   */
  async getMockPosts(disasterId, tags = []) {
    try {
      const now = new Date();
      const allTags = tags.length ? tags : DISASTER_TAGS.slice(0, 3);
      const posts = [];

      for (let i = 0; i < 5; i++) {
        const tag = allTags[i % allTags.length];
        const user =
          this.mockUsers[Math.floor(Math.random() * this.mockUsers.length)];

        posts.push({
          post: `#${tag} ${this._generateRandomMessage(tag, disasterId)}`,
          user,
          timestamp: new Date(
            now.getTime() - Math.random() * 3600000
          ).toISOString(),
        });
      }

      logger.info("Mock social media posts generated", {
        disasterId,
        count: posts.length,
      });
      return posts;
    } catch (error) {
      logger.error("Error generating social media posts", {
        error: error.message,
        disasterId,
      });
      return [];
    }
  }

  _generateRandomMessage(tag, disasterId) {
    const templates = [
      `Urgent help needed near ${tag} zone.`,
      `Looking for medical aid. #${tag}`,
      `Update from ground zero. Situation worsening.`,
      `Anyone near affected area? Please respond.`,
      `Providing shelter for those hit by ${tag} disaster.`,
    ];
    return (
      templates[Math.floor(Math.random() * templates.length)] +
      ` [Ref: ${disasterId}]`
    );
  }
}

module.exports = new SocialMediaService();
