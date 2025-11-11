const fnfSettlementService = require('../services/fnfSettlement.service');
const logger = require('../config/logger');

/**
 * Initiate F&F case
 */
const initiateFnFCase = async (req, res, next) => {
  try {
    const caseData = req.body;
    const initiatedBy = req.user.id;
    
    const fnfCase = await fnfSettlementService.initiateFnFCase(caseData, initiatedBy);
    
    res.status(201).json({
      success: true,
      message: 'F&F case initiated successfully',
      data: fnfCase
    });
  } catch (error) {
    logger.error('Error in initiateFnFCase controller:', error);
    next(error);
  }
};

/**
 * Get F&F case
 */
const getFnFCase = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const fnfCase = await fnfSettlementService.getFnFCase(id);
    
    res.json({
      success: true,
      data: fnfCase
    });
  } catch (error) {
    logger.error('Error in getFnFCase controller:', error);
    next(error);
  }
};

/**
 * Get F&F cases
 */
const getFnFCases = async (req, res, next) => {
  try {
    const filters = req.query;
    
    const result = await fnfSettlementService.getFnFCases(filters);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in getFnFCases controller:', error);
    next(error);
  }
};

/**
 * Approve F&F case
 */
const approveFnFCase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { level, comments } = req.body;
    const approverId = req.user.id;
    
    const fnfCase = await fnfSettlementService.approveFnFCase(id, approverId, level, comments);
    
    res.json({
      success: true,
      message: 'F&F case approved successfully',
      data: fnfCase
    });
  } catch (error) {
    logger.error('Error in approveFnFCase controller:', error);
    next(error);
  }
};

/**
 * Process payout
 */
const processPayout = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payoutData = req.body;
    const initiatedBy = req.user.id;
    
    const fnfCase = await fnfSettlementService.processPayout(id, payoutData, initiatedBy);
    
    res.json({
      success: true,
      message: 'F&F payout processed successfully',
      data: fnfCase
    });
  } catch (error) {
    logger.error('Error in processPayout controller:', error);
    next(error);
  }
};

module.exports = {
  initiateFnFCase,
  getFnFCase,
  getFnFCases,
  approveFnFCase,
  processPayout
};

