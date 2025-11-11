const incentiveClawbackService = require('../services/incentiveClawback.service');
const logger = require('../config/logger');

/**
 * Create incentive claim
 */
const createIncentiveClaim = async (req, res, next) => {
  try {
    const claimData = req.body;
    const createdBy = req.user.id;
    
    const claim = await incentiveClawbackService.createIncentiveClaim(claimData, createdBy);
    
    res.status(201).json({
      success: true,
      message: 'Incentive claim created successfully',
      data: claim
    });
  } catch (error) {
    logger.error('Error in createIncentiveClaim controller:', error);
    next(error);
  }
};

/**
 * Approve incentive claim
 */
const approveIncentiveClaim = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { level, amount, comments } = req.body;
    const approverId = req.user.id;
    
    const claim = await incentiveClawbackService.approveIncentiveClaim(id, approverId, level, amount, comments);
    
    res.json({
      success: true,
      message: 'Incentive claim approved successfully',
      data: claim
    });
  } catch (error) {
    logger.error('Error in approveIncentiveClaim controller:', error);
    next(error);
  }
};

/**
 * Apply claw-back
 */
const applyClawback = async (req, res, next) => {
  try {
    const { run_id } = req.body;
    const { method } = req.query;
    
    const result = await incentiveClawbackService.applyClawback(run_id, method);
    
    res.json({
      success: true,
      message: 'Claw-back applied successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in applyClawback controller:', error);
    next(error);
  }
};

/**
 * Get incentive claims
 */
const getIncentiveClaims = async (req, res, next) => {
  try {
    const filters = req.query;
    
    const result = await incentiveClawbackService.getIncentiveClaims(filters);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in getIncentiveClaims controller:', error);
    next(error);
  }
};

/**
 * Process returns/remakes feed
 */
const processReturnsRemakesFeed = async (req, res, next) => {
  try {
    const feedData = req.body;
    const createdBy = req.user.id;
    
    const feed = await incentiveClawbackService.processReturnsRemakesFeed(feedData, createdBy);
    
    res.status(201).json({
      success: true,
      message: 'Returns/remakes feed processed successfully',
      data: feed
    });
  } catch (error) {
    logger.error('Error in processReturnsRemakesFeed controller:', error);
    next(error);
  }
};

module.exports = {
  createIncentiveClaim,
  approveIncentiveClaim,
  applyClawback,
  getIncentiveClaims,
  processReturnsRemakesFeed
};

