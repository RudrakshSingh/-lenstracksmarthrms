const SystemSettings = require('../models/SystemSettings.model');
const logger = require('../config/logger');

class SystemSettingsService {
  /**
   * Get all settings
   */
  async getSettings(filters = {}) {
    try {
      const query = {};

      if (filters.category) {
        query.category = filters.category;
      }

      if (filters.isPublic !== undefined) {
        query.isPublic = filters.isPublic === 'true';
      }

      const settings = await SystemSettings.find(query)
        .populate('updated_by', 'firstName lastName email')
        .sort({ category: 1, key: 1 })
        .lean();

      // Convert to key-value object format
      const settingsObj = {};
      settings.forEach(setting => {
        settingsObj[setting.key] = {
          value: setting.value,
          type: setting.type,
          category: setting.category,
          description: setting.description,
          isPublic: setting.isPublic,
          updatedAt: setting.updatedAt,
          updatedBy: setting.updated_by
        };
      });

      return settingsObj;
    } catch (error) {
      logger.error('Error in getSettings service', { error: error.message });
      throw error;
    }
  }

  /**
   * Get setting by key
   */
  async getSetting(key) {
    try {
      const setting = await SystemSettings.findOne({ key })
        .populate('updated_by', 'firstName lastName email')
        .lean();

      if (!setting) {
        const error = new Error('Setting not found');
        error.statusCode = 404;
        throw error;
      }

      return setting;
    } catch (error) {
      logger.error('Error in getSetting service', { error: error.message });
      throw error;
    }
  }

  /**
   * Update settings (bulk)
   */
  async updateSettings(settingsData, updatedBy) {
    try {
      const results = [];

      for (const [key, data] of Object.entries(settingsData)) {
        const updateData = {
          key,
          value: data.value,
          type: data.type || 'string',
          category: data.category || 'general',
          description: data.description,
          isPublic: data.isPublic || false,
          updated_by: updatedBy
        };

        const setting = await SystemSettings.findOneAndUpdate(
          { key },
          updateData,
          { upsert: true, new: true }
        ).populate('updated_by', 'firstName lastName email');

        results.push(setting.toObject());
      }

      return results;
    } catch (error) {
      logger.error('Error in updateSettings service', { error: error.message });
      throw error;
    }
  }

  /**
   * Update single setting
   */
  async updateSetting(key, value, type = 'string', category = 'general', description = null, isPublic = false, updatedBy) {
    try {
      const setting = await SystemSettings.findOneAndUpdate(
        { key },
        {
          key,
          value,
          type,
          category,
          description,
          isPublic,
          updated_by: updatedBy
        },
        { upsert: true, new: true }
      ).populate('updated_by', 'firstName lastName email');

      return setting.toObject();
    } catch (error) {
      logger.error('Error in updateSetting service', { error: error.message });
      throw error;
    }
  }
}

module.exports = new SystemSettingsService();

