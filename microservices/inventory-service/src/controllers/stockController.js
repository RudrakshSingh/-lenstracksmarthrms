const stockService = require('../services/stockService');
const logger = require('../config/logger');
const { 
  sendSuccess, 
  sendError, 
  sendNotFound,
  createPagination,
  parsePagination,
  parseFilters
} = require('../../../shared/utils/response.util');

/**
 * Get stock movements
 * GET /api/inventory/stock/movements
 */
const getStockMovements = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const allowedFilters = ['store_id', 'status', 'transfer_type', 'date_from', 'date_to'];
    const filters = parseFilters(req.query, allowedFilters);

    const result = await stockService.getStockMovements(filters, page, limit);
    const pagination = createPagination(page, limit, result.total);

    return sendSuccess(res, result.data, 'Stock movements retrieved successfully', pagination, 200);
  } catch (error) {
    logger.error('Error in getStockMovements controller', { error: error.message });
    next(error);
  }
};

/**
 * Adjust stock
 * POST /api/inventory/stock/adjust
 */
const adjustStock = async (req, res, next) => {
  try {
    const result = await stockService.adjustStock(req.body, req.user.id);
    return sendSuccess(res, result, 'Stock adjusted successfully', null, 200);
  } catch (error) {
    if (error.statusCode === 404) {
      return sendNotFound(res, 'Inventory item', req.body.product_id);
    }
    if (error.statusCode === 400) {
      return sendError(res, error.message, error.message, 400);
    }
    logger.error('Error in adjustStock controller', { error: error.message });
    next(error);
  }
};

/**
 * Get stock summary
 * GET /api/inventory/stock/summary
 */
const getStockSummary = async (req, res, next) => {
  try {
    const allowedFilters = ['store_id', 'category'];
    const filters = parseFilters(req.query, allowedFilters);

    const summary = await stockService.getStockSummary(filters);
    return sendSuccess(res, summary, 'Stock summary retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getStockSummary controller', { error: error.message });
    next(error);
  }
};

/**
 * Get low stock items
 * GET /api/inventory/items/low-stock
 */
const getLowStockItems = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const allowedFilters = ['store_id', 'category'];
    const filters = parseFilters(req.query, allowedFilters);

    const result = await stockService.getLowStockItems(filters, page, limit);
    const pagination = createPagination(page, limit, result.total);

    return sendSuccess(res, result.data, 'Low stock items retrieved successfully', pagination, 200);
  } catch (error) {
    logger.error('Error in getLowStockItems controller', { error: error.message });
    next(error);
  }
};

module.exports = {
  getStockMovements,
  adjustStock,
  getStockSummary,
  getLowStockItems
};

