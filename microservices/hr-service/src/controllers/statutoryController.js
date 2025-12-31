const statutoryExportService = require('../services/statutoryExport.service');
const StatExport = require('../models/StatExport.model');
const User = require('../models/User.model');
const logger = require('../config/logger');
const { sendSuccess, sendError } = require('../../../shared/utils/response.util.js');

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

/**
 * Get Form-16 by year (GET endpoint)
 */
const getForm16 = async (req, res, next) => {
  try {
    const { year } = req.params;
    const employeeId = req.user.employee_id || req.user._id;

    // Find Form-16 export for the employee and year
    const form16 = await StatExport.findOne({
      export_type: 'FORM_16',
      employee_id: employeeId,
      year: parseInt(year)
    }).lean();

    if (!form16) {
      return sendError(res, 'Form-16 not found', 'Form-16 not found for the specified year', 404);
    }

    return sendSuccess(res, form16, 'Form-16 retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getForm16 controller:', error);
    return sendError(res, error.message || 'Failed to retrieve Form-16', 'Internal server error', 500);
  }
};

/**
 * Get employee documents
 */
const getMyDocuments = async (req, res, next) => {
  try {
    const employeeId = req.user.employee_id || req.user._id;

    // Get all statutory exports for the employee
    const documents = await StatExport.find({
      employee_id: employeeId
    })
    .sort({ created_at: -1 })
    .lean();

    const formattedDocuments = documents.map(doc => ({
      id: doc._id,
      type: doc.export_type,
      year: doc.year,
      month: doc.month,
      quarter: doc.quarter,
      fileUrl: doc.file_url,
      status: doc.status,
      createdAt: doc.created_at
    }));

    return sendSuccess(res, formattedDocuments, 'Employee documents retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getMyDocuments controller:', error);
    return sendError(res, error.message || 'Failed to retrieve documents', 'Internal server error', 500);
  }
};

/**
 * Get statutory deductions
 */
const getStatutoryDeductions = async (req, res, next) => {
  try {
    const { employeeId, month, year } = req.query;
    const targetEmployeeId = employeeId || req.user.employee_id || req.user._id;

    // This would typically come from payroll data
    // For now, return placeholder structure
    const deductions = {
      employeeId: targetEmployeeId,
      month: month ? parseInt(month) : new Date().getMonth() + 1,
      year: year ? parseInt(year) : new Date().getFullYear(),
      pf: {
        employeeContribution: 0,
        employerContribution: 0,
        total: 0
      },
      esic: {
        employeeContribution: 0,
        employerContribution: 0,
        total: 0
      },
      pt: 0,
      tds: 0,
      totalDeductions: 0
    };

    return sendSuccess(res, deductions, 'Statutory deductions retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getStatutoryDeductions controller:', error);
    return sendError(res, error.message || 'Failed to retrieve statutory deductions', 'Internal server error', 500);
  }
};

module.exports = {
  generateEPFExport,
  generateESICExport,
  generateTDSForm24Q,
  generateForm16,
  getStatExports,
  validateExport,
  getForm16,
  getMyDocuments,
  getStatutoryDeductions
};

