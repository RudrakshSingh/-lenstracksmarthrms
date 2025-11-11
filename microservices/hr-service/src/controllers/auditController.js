const auditService = require('../services/audit.service');
const logger = require('../config/logger');

/**
 * Get audit logs
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const filters = req.query;
    
    const result = await auditService.getAuditLogs(filters);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in getAuditLogs controller:', error);
    next(error);
  }
};

/**
 * Verify consistency
 */
const verifyConsistency = async (req, res, next) => {
  try {
    const { entity, entity_id } = req.query;
    
    if (!entity || !entity_id) {
      return res.status(400).json({
        success: false,
        message: 'Entity and entity_id are required'
      });
    }
    
    const result = await auditService.verifyConsistency(entity, entity_id);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in verifyConsistency controller:', error);
    next(error);
  }
};

module.exports = {
  getAuditLogs,
  verifyConsistency
};

