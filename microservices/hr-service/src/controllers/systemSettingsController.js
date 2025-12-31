const systemSettingsService = require('../services/systemSettings.service');
const logger = require('../config/logger');
const { 
  sendSuccess, 
  sendError, 
  sendNotFound,
  parseFilters
} = require('../../../shared/utils/response.util.js');

/**
 * Get all settings
 * GET /api/admin/settings
 */
const getSettings = async (req, res, next) => {
  try {
    const allowedFilters = ['category', 'isPublic'];
    const filters = parseFilters(req.query, allowedFilters);

    const settings = await systemSettingsService.getSettings(filters);
    return sendSuccess(res, settings, 'Settings retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getSettings controller', { error: error.message });
    next(error);
  }
};

/**
 * Update settings
 * PUT /api/admin/settings
 */
const updateSettings = async (req, res, next) => {
  try {
    const settings = await systemSettingsService.updateSettings(req.body, req.user.id);
    return sendSuccess(res, settings, 'Settings updated successfully', null, 200);
  } catch (error) {
    logger.error('Error in updateSettings controller', { error: error.message });
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings
};

