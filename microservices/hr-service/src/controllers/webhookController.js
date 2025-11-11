const incentiveClawbackService = require('../services/incentiveClawback.service');
const statutoryExportService = require('../services/statutoryExport.service');
const auditService = require('../services/audit.service');
const logger = require('../config/logger');

/**
 * Handle sales closed webhook
 */
const handleSalesClosed = async (req, res, next) => {
  try {
    const { invoice_id, employee_id, amount, sale_date, store_id } = req.body;
    
    // This would trigger incentive calculation
    // For now, just log it
    logger.info(`Sales closed webhook received: ${invoice_id} for employee ${employee_id}`);
    
    await auditService.logAction(
      'WEBHOOK_SALES_CLOSED',
      'SALES',
      invoice_id,
      'SYSTEM',
      { invoice_id, employee_id, amount, sale_date },
      { source: 'WEBHOOK' }
    );
    
    res.json({
      success: true,
      message: 'Sales closed webhook processed'
    });
  } catch (error) {
    logger.error('Error in handleSalesClosed webhook:', error);
    next(error);
  }
};

/**
 * Handle returns/remakes webhook
 */
const handleReturnsRemakes = async (req, res, next) => {
  try {
    const feedData = req.body;
    
    const feed = await incentiveClawbackService.processReturnsRemakesFeed(
      feedData,
      'SYSTEM'
    );
    
    res.json({
      success: true,
      message: 'Returns/remakes webhook processed',
      data: feed
    });
  } catch (error) {
    logger.error('Error in handleReturnsRemakes webhook:', error);
    next(error);
  }
};

/**
 * Handle statutory filing status webhook
 */
const handleStatFilingStatus = async (req, res, next) => {
  try {
    const { export_id, filing_status, filed_at, filing_ref } = req.body;
    
    // Update export record
    const StatExport = require('../models/StatExport.model');
    const exportRecord = await StatExport.findById(export_id);
    
    if (exportRecord) {
      exportRecord.filing.filed = filing_status === 'FILED';
      exportRecord.filing.filed_at = filed_at ? new Date(filed_at) : new Date();
      exportRecord.filing.filing_ref = filing_ref;
      exportRecord.filing.filed_on_time = true; // Would check against deadline
      
      await exportRecord.save();
    }
    
    await auditService.logAction(
      'WEBHOOK_STAT_FILING',
      'STAT_EXPORT',
      export_id,
      'SYSTEM',
      { filing_status, filed_at, filing_ref },
      { source: 'WEBHOOK' }
    );
    
    res.json({
      success: true,
      message: 'Statutory filing status webhook processed'
    });
  } catch (error) {
    logger.error('Error in handleStatFilingStatus webhook:', error);
    next(error);
  }
};

module.exports = {
  handleSalesClosed,
  handleReturnsRemakes,
  handleStatFilingStatus
};

