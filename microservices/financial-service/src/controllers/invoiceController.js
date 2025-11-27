const invoiceService = require('../services/invoiceService');
const logger = require('../config/logger');
const { 
  sendSuccess, 
  sendError, 
  sendNotFound,
  createPagination,
  parsePagination,
  parseFilters
} = require('../../shared/utils/response.util');

/**
 * Get all invoices
 * GET /api/financial/invoices
 */
const getInvoices = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const allowedFilters = ['status', 'payment_status', 'customer_id', 'store_id', 'date_from', 'date_to'];
    const filters = parseFilters(req.query, allowedFilters);

    const result = await invoiceService.getInvoices(filters, page, limit);
    const pagination = createPagination(page, limit, result.total);

    return sendSuccess(res, result.data, 'Invoices retrieved successfully', pagination, 200);
  } catch (error) {
    logger.error('Error in getInvoices controller', { error: error.message });
    next(error);
  }
};

/**
 * Get invoice by ID
 * GET /api/financial/invoices/:id
 */
const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.id);
    return sendSuccess(res, invoice, 'Invoice retrieved successfully', null, 200);
  } catch (error) {
    if (error.statusCode === 404) {
      return sendNotFound(res, 'Invoice', req.params.id);
    }
    logger.error('Error in getInvoiceById controller', { error: error.message });
    next(error);
  }
};

/**
 * Create new invoice
 * POST /api/financial/invoices
 */
const createInvoice = async (req, res, next) => {
  try {
    const invoice = await invoiceService.createInvoice(req.body, req.user.id);
    return sendSuccess(res, invoice, 'Invoice created successfully', null, 201);
  } catch (error) {
    logger.error('Error in createInvoice controller', { error: error.message });
    next(error);
  }
};

/**
 * Send invoice
 * POST /api/financial/invoices/:id/send
 */
const sendInvoice = async (req, res, next) => {
  try {
    const invoice = await invoiceService.sendInvoice(
      req.params.id,
      req.body.send_to,
      req.user.id
    );
    return sendSuccess(res, invoice, 'Invoice sent successfully', null, 200);
  } catch (error) {
    if (error.statusCode === 404) {
      return sendNotFound(res, 'Invoice', req.params.id);
    }
    if (error.statusCode === 400) {
      return sendError(res, error.message, error.message, 400);
    }
    logger.error('Error in sendInvoice controller', { error: error.message });
    next(error);
  }
};

module.exports = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  sendInvoice
};

