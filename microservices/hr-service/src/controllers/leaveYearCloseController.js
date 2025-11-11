const leaveYearCloseService = require('../services/leaveYearClose.service');
const logger = require('../config/logger');

/**
 * Process leave year close
 */
const processLeaveYearClose = async (req, res, next) => {
  try {
    const { year } = req.body;
    const processedBy = req.user.id;
    
    const result = await leaveYearCloseService.processLeaveYearClose(year, processedBy);
    
    res.json({
      success: true,
      message: 'Leave year close processed successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in processLeaveYearClose controller:', error);
    next(error);
  }
};

module.exports = {
  processLeaveYearClose
};

