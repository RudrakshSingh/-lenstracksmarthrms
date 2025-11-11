const statutoryExportService = require('../services/statutoryExport.service');
const logger = require('../config/logger');

/**
 * Generate EPF export
 */
const generateEPFExport = async (req, res, next) => {
  try {
    const { month, year } = req.body;
    const generatedBy = req.user.id;
    
    const exportRecord = await statutoryExportService.generateEPFExport(month, year, generatedBy);
    
    res.status(201).json({
      success: true,
      message: 'EPF export generated successfully',
      data: exportRecord
    });
  } catch (error) {
    logger.error('Error in generateEPFExport controller:', error);
    next(error);
  }
};

/**
 * Generate ESIC export
 */
const generateESICExport = async (req, res, next) => {
  try {
    const { month, year } = req.body;
    const generatedBy = req.user.id;
    
    const exportRecord = await statutoryExportService.generateESICExport(month, year, generatedBy);
    
    res.status(201).json({
      success: true,
      message: 'ESIC export generated successfully',
      data: exportRecord
    });
  } catch (error) {
    logger.error('Error in generateESICExport controller:', error);
    next(error);
  }
};

/**
 * Generate TDS Form-24Q
 */
const generateTDSForm24Q = async (req, res, next) => {
  try {
    const { quarter, year } = req.body;
    const generatedBy = req.user.id;
    
    const exportRecord = await statutoryExportService.generateTDSForm24Q(quarter, year, generatedBy);
    
    res.status(201).json({
      success: true,
      message: 'Form-24Q generated successfully',
      data: exportRecord
    });
  } catch (error) {
    logger.error('Error in generateTDSForm24Q controller:', error);
    next(error);
  }
};

/**
 * Generate Form-16
 */
const generateForm16 = async (req, res, next) => {
  try {
    const { employee_id, year } = req.body;
    const generatedBy = req.user.id;
    
    const exportRecord = await statutoryExportService.generateForm16(employee_id, year, generatedBy);
    
    res.status(201).json({
      success: true,
      message: 'Form-16 generated successfully',
      data: exportRecord
    });
  } catch (error) {
    logger.error('Error in generateForm16 controller:', error);
    next(error);
  }
};

/**
 * Get stat exports
 */
const getStatExports = async (req, res, next) => {
  try {
    const filters = req.query;
    
    const result = await statutoryExportService.getStatExports(filters);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in getStatExports controller:', error);
    next(error);
  }
};

/**
 * Validate export
 */
const validateExport = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const exportRecord = await statutoryExportService.validateExport(id);
    
    res.json({
      success: true,
      message: 'Export validated successfully',
      data: exportRecord
    });
  } catch (error) {
    logger.error('Error in validateExport controller:', error);
    next(error);
  }
};

module.exports = {
  generateEPFExport,
  generateESICExport,
  generateTDSForm24Q,
  generateForm16,
  getStatExports,
  validateExport
};

