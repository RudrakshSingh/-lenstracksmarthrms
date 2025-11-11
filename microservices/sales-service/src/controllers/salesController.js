const salesService = require('../services/salesService');
const SalesOrder = require('../models/SalesOrder.model');
const logger = require('../config/logger');

/**
 * @desc Create or update customer
 * @route POST /api/sales/customers
 * @access Private (Admin, Manager, Sales)
 */
const createOrUpdateCustomer = async (req, res, next) => {
  try {
    const customerData = req.body;
    const createdBy = req.user.id;
    
    const customer = await salesService.createOrUpdateCustomer(customerData, createdBy);
    
    res.status(201).json({
      success: true,
      message: 'Customer created/updated successfully',
      data: customer
    });
  } catch (error) {
    logger.error('Error in createOrUpdateCustomer controller:', error);
    next(error);
  }
};

/**
 * @desc Get customer by identifier
 * @route GET /api/sales/customers/:identifier
 * @access Private (Admin, Manager, Sales)
 */
const getCustomer = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    
    const customer = await salesService.getCustomer(identifier);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Customer retrieved successfully',
      data: customer
    });
  } catch (error) {
    logger.error('Error in getCustomer controller:', error);
    next(error);
  }
};

/**
 * @desc Search customers
 * @route GET /api/sales/customers/search
 * @access Private (Admin, Manager, Sales)
 */
const searchCustomers = async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }
    
    const customers = await salesService.searchCustomers(q, parseInt(limit));
    
    res.status(200).json({
      success: true,
      message: 'Customers retrieved successfully',
      data: customers
    });
  } catch (error) {
    logger.error('Error in searchCustomers controller:', error);
    next(error);
  }
};

/**
 * @desc Create sales order
 * @route POST /api/sales/orders
 * @access Private (Admin, Manager, Sales)
 */
const createSalesOrder = async (req, res, next) => {
  try {
    const orderData = req.body;
    const createdBy = req.user.id;
    
    const order = await salesService.createSalesOrder(orderData, createdBy);
    
    res.status(201).json({
      success: true,
      message: 'Sales order created successfully',
      data: order
    });
  } catch (error) {
    logger.error('Error in createSalesOrder controller:', error);
    next(error);
  }
};

/**
 * @desc Get sales orders
 * @route GET /api/sales/orders
 * @access Private (Admin, Manager, Sales)
 */
const getSalesOrders = async (req, res, next) => {
  try {
    const filters = req.query;
    
    const result = await salesService.getSalesOrders(filters);
    
    res.status(200).json({
      success: true,
      message: 'Sales orders retrieved successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in getSalesOrders controller:', error);
    next(error);
  }
};

/**
 * @desc Get sales order by ID
 * @route GET /api/sales/orders/:orderId
 * @access Private (Admin, Manager, Sales)
 */
const getSalesOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    
    const order = await SalesOrder.findById(orderId)
      .populate('customer_id', 'full_name phone email')
      .populate('store_id', 'name address')
      .populate('sales_person_id', 'name email')
      .populate('items.product_variant_id', 'variant_name sub_sku');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Sales order retrieved successfully',
      data: order
    });
  } catch (error) {
    logger.error('Error in getSalesOrderById controller:', error);
    next(error);
  }
};

/**
 * @desc Update sales order status
 * @route PUT /api/sales/orders/:orderId/status
 * @access Private (Admin, Manager, Sales)
 */
const updateSalesOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status, payment_status } = req.body;
    
    const order = await SalesOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found'
      });
    }
    
    if (status) order.status = status;
    if (payment_status) order.payment_status = payment_status;
    
    order.updated_at = new Date();
    await order.save();
    
    res.status(200).json({
      success: true,
      message: 'Sales order status updated successfully',
      data: order
    });
  } catch (error) {
    logger.error('Error in updateSalesOrderStatus controller:', error);
    next(error);
  }
};

/**
 * @desc Create prescription
 * @route POST /api/sales/prescriptions
 * @access Private (Admin, Manager, Sales)
 */
const createPrescription = async (req, res, next) => {
  try {
    const prescriptionData = req.body;
    const createdBy = req.user.id;
    
    const prescription = await salesService.createPrescription(prescriptionData, createdBy);
    
    res.status(201).json({
      success: true,
      message: 'Prescription created successfully',
      data: prescription
    });
  } catch (error) {
    logger.error('Error in createPrescription controller:', error);
    next(error);
  }
};

/**
 * @desc Get prescriptions
 * @route GET /api/sales/prescriptions
 * @access Private (Admin, Manager, Sales)
 */
const getPrescriptions = async (req, res, next) => {
  try {
    const filters = req.query;
    
    const result = await salesService.getPrescriptions(filters);
    
    res.status(200).json({
      success: true,
      message: 'Prescriptions retrieved successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in getPrescriptions controller:', error);
    next(error);
  }
};

/**
 * @desc Get sales dashboard
 * @route GET /api/sales/dashboard
 * @access Private (Admin, Manager, Sales)
 */
const getSalesDashboard = async (req, res, next) => {
  try {
    const { store_id, period_start, period_end } = req.query;
    
    const period = period_start && period_end ? {
      start: new Date(period_start),
      end: new Date(period_end)
    } : null;
    
    const dashboard = await salesService.getSalesDashboard(store_id, period);
    
    res.status(200).json({
      success: true,
      message: 'Sales dashboard retrieved successfully',
      data: dashboard
    });
  } catch (error) {
    logger.error('Error in getSalesDashboard controller:', error);
    next(error);
  }
};

/**
 * @desc Get product availability
 * @route GET /api/sales/products/availability
 * @access Private (Admin, Manager, Sales)
 */
const getProductAvailability = async (req, res, next) => {
  try {
    const { product_variant_id, store_id } = req.query;
    
    if (!product_variant_id || !store_id) {
      return res.status(400).json({
        success: false,
        message: 'Product variant ID and store ID are required'
      });
    }
    
    const inventory = await Inventory.findOne({
      product_variant_id,
      store_id,
      is_active: true
    }).populate('product_variant_id', 'variant_name sub_sku');
    
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in inventory'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Product availability retrieved successfully',
      data: {
        product_variant_id: inventory.product_variant_id._id,
        product_name: inventory.product_variant_id.variant_name,
        sku: inventory.product_variant_id.sub_sku,
        current_stock: inventory.current_stock,
        available_stock: inventory.available_stock,
        reserved_stock: inventory.reserved_stock
      }
    });
  } catch (error) {
    logger.error('Error in getProductAvailability controller:', error);
    next(error);
  }
};

/**
 * @desc Create manual sales entry (temporary entry)
 * @route POST /api/sales/manual-entry
 * @access Private (Admin, Manager, Sales, Accountant)
 */
const createManualSalesEntry = async (req, res, next) => {
  try {
    const orderData = req.body;
    const createdBy = req.user.id;
    
    const order = await salesService.createManualSalesEntry(orderData, createdBy);
    
    res.status(201).json({
      success: true,
      message: 'Manual sales entry created successfully',
      data: order
    });
  } catch (error) {
    logger.error('Error in createManualSalesEntry controller:', error);
    next(error);
  }
};

module.exports = {
  createOrUpdateCustomer,
  getCustomer,
  searchCustomers,
  createSalesOrder,
  getSalesOrders,
  getSalesOrderById,
  updateSalesOrderStatus,
  createPrescription,
  getPrescriptions,
  getSalesDashboard,
  getProductAvailability,
  createManualSalesEntry
};
