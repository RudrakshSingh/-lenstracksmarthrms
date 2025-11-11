const reportsService = require('../services/reports.service');
const logger = require('../config/logger');

/**
 * Get payroll cost by store/role
 */
const getPayrollCostByStoreRole = async (req, res, next) => {
  try {
    const filters = req.query;
    
    const result = await reportsService.getPayrollCostByStoreRole(filters);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in getPayrollCostByStoreRole controller:', error);
    next(error);
  }
};

/**
 * Get incentive as % of sales
 */
const getIncentiveAsPercentOfSales = async (req, res, next) => {
  try {
    const filters = req.query;
    
    const result = await reportsService.getIncentiveAsPercentOfSales(filters);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in getIncentiveAsPercentOfSales controller:', error);
    next(error);
  }
};

/**
 * Get claw-back report
 */
const getClawbackReport = async (req, res, next) => {
  try {
    const filters = req.query;
    
    const result = await reportsService.getClawbackReport(filters);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in getClawbackReport controller:', error);
    next(error);
  }
};

/**
 * Get LWP days report
 */
const getLWPDaysReport = async (req, res, next) => {
  try {
    const filters = req.query;
    
    const result = await reportsService.getLWPDaysReport(filters);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in getLWPDaysReport controller:', error);
    next(error);
  }
};

/**
 * Get leave utilization report
 */
const getLeaveUtilizationReport = async (req, res, next) => {
  try {
    const filters = req.query;
    
    const result = await reportsService.getLeaveUtilizationReport(filters);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in getLeaveUtilizationReport controller:', error);
    next(error);
  }
};

/**
 * Get attrition report
 */
const getAttritionReport = async (req, res, next) => {
  try {
    const filters = req.query;
    
    const result = await reportsService.getAttritionReport(filters);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in getAttritionReport controller:', error);
    next(error);
  }
};

/**
 * Get F&F stats
 */
const getFnFStats = async (req, res, next) => {
  try {
    const filters = req.query;
    
    const result = await reportsService.getFnFStats(filters);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in getFnFStats controller:', error);
    next(error);
  }
};

/**
 * Get statutory filing on-time percentage
 */
const getStatutoryFilingOnTimePercent = async (req, res, next) => {
  try {
    const filters = req.query;
    
    const result = await reportsService.getStatutoryFilingOnTimePercent(filters);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in getStatutoryFilingOnTimePercent controller:', error);
    next(error);
  }
};

module.exports = {
  getPayrollCostByStoreRole,
  getIncentiveAsPercentOfSales,
  getClawbackReport,
  getLWPDaysReport,
  getLeaveUtilizationReport,
  getAttritionReport,
  getFnFStats,
  getStatutoryFilingOnTimePercent
};

