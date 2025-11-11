const Customer = require('../models/Customer.model');
const SalesOrder = require('../models/SalesOrder.model');
const Prescription = require('../models/Prescription.model');
const ProductVariant = require('../models/ProductVariant.model');
const Inventory = require('../models/Inventory.model');
const InventoryBatch = require('../models/pos/InventoryBatch.model');
const Ledger = require('../models/Ledger.model');
const gstService = require('./gstService');
const logger = require('../config/logger');

class SalesService {
  /**
   * Create or update customer
   */
  async createOrUpdateCustomer(customerData, createdBy) {
    try {
      const { customer_id, phone, email } = customerData;
      
      // Check if customer already exists
      let customer = await Customer.findOne({
        $or: [
          { customer_id: customer_id },
          { phone: phone },
          { email: email }
        ]
      });
      
      if (customer) {
        // Update existing customer
        Object.assign(customer, customerData);
        customer.updated_at = new Date();
        await customer.save();
      } else {
        // Create new customer
        customer = new Customer({
          ...customerData,
          created_by: createdBy
        });
        await customer.save();
      }
      
      logger.info(`Customer ${customer.customer_id} created/updated`);
      return customer;
    } catch (error) {
      logger.error('Error creating/updating customer:', error);
      throw error;
    }
  }

  /**
   * Get customer by ID or phone
   */
  async getCustomer(identifier) {
    try {
      const customer = await Customer.findOne({
        $or: [
          { customer_id: identifier },
          { phone: identifier },
          { email: identifier }
        ]
      });
      
      return customer;
    } catch (error) {
      logger.error('Error getting customer:', error);
      throw error;
    }
  }

  /**
   * Search customers
   */
  async searchCustomers(searchTerm, limit = 10) {
    try {
      const customers = await Customer.find({
        $or: [
          { full_name: { $regex: searchTerm, $options: 'i' } },
          { phone: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
          { customer_id: { $regex: searchTerm, $options: 'i' } }
        ],
        is_active: true
      })
      .limit(limit)
      .sort({ last_purchase_date: -1 });
      
      return customers;
    } catch (error) {
      logger.error('Error searching customers:', error);
      throw error;
    }
  }

  /**
   * Create sales order
   */
  async createSalesOrder(orderData, createdBy) {
    try {
      const { customer_id, items, store_id, sales_person_id } = orderData;
      
      // Validate inventory availability
      for (const item of items) {
        const inventory = await Inventory.findOne({
          product_variant_id: item.product_variant_id,
          store_id: store_id,
          is_active: true
        });
        
        if (!inventory || inventory.available_stock < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.product_name}`);
        }
      }
      
      // Get product details
      const productVariants = await ProductVariant.find({
        _id: { $in: items.map(item => item.product_variant_id) }
      }).populate('product_master_id');
      
      // Calculate GST for each item
      const itemsWithGST = [];
      for (const item of items) {
        const productVariant = productVariants.find(pv => pv._id.toString() === item.product_variant_id.toString());
        if (!productVariant) {
          throw new Error(`Product variant not found: ${item.product_variant_id}`);
        }
        
        // Calculate GST
        const gstCalculation = await gstService.calculateGST({
          product_variant_id: item.product_variant_id,
          hsn_code: productVariant.product_master_id.hsn_code || '9004',
          taxable_value: item.unit_price * item.quantity,
          ship_from_state: 'DL', // Default, should be from store
          ship_to_state: 'DL'   // Default, should be from customer address
        });
        
        itemsWithGST.push({
          ...item,
          product_name: productVariant.variant_name,
          sku: productVariant.sub_sku,
          tax_rate: gstCalculation.gst_rate,
          tax_amount: gstCalculation.total_tax
        });
      }
      
      // Create sales order
      const salesOrder = new SalesOrder({
        ...orderData,
        items: itemsWithGST,
        sales_person_id: createdBy,
        sales_person_name: 'Sales Person' // Should be populated from user
      });
      
      await salesOrder.save();
      
      // Update inventory
      await this.updateInventoryForSale(salesOrder);
      
      // Create ledger entries
      await this.createSalesLedgerEntries(salesOrder);
      
      logger.info(`Sales order created: ${salesOrder.order_number}`);
      return salesOrder;
    } catch (error) {
      logger.error('Error creating sales order:', error);
      throw error;
    }
  }

  /**
   * Update inventory for sale
   */
  async updateInventoryForSale(salesOrder) {
    try {
      for (const item of salesOrder.items) {
        // Update inventory
        const inventory = await Inventory.findOne({
          product_variant_id: item.product_variant_id,
          store_id: salesOrder.store_id,
          is_active: true
        });
        
        if (inventory) {
          inventory.current_stock -= item.quantity;
          inventory.reserved_stock += item.quantity;
          inventory.last_movement_date = new Date();
          await inventory.save();
        }
        
        // Update batch inventory using FIFO
        await this.updateBatchInventoryForSale(item.product_variant_id, item.quantity, salesOrder.store_id);
      }
    } catch (error) {
      logger.error('Error updating inventory for sale:', error);
      throw error;
    }
  }

  /**
   * Update batch inventory using FIFO
   */
  async updateBatchInventoryForSale(productVariantId, quantity, storeId) {
    try {
      const batches = await InventoryBatch.find({
        product_variant_id: productVariantId,
        store_id: storeId,
        status: 'ACTIVE',
        current_quantity: { $gt: 0 }
      }).sort({ fifo_sequence: 1 });
      
      let remainingQuantity = quantity;
      
      for (const batch of batches) {
        if (remainingQuantity <= 0) break;
        
        const quantityToDeduct = Math.min(remainingQuantity, batch.current_quantity);
        batch.current_quantity -= quantityToDeduct;
        remainingQuantity -= quantityToDeduct;
        
        if (batch.current_quantity <= 0) {
          batch.status = 'EXHAUSTED';
        }
        
        await batch.save();
      }
      
      if (remainingQuantity > 0) {
        throw new Error(`Insufficient stock in batches for product ${productVariantId}`);
      }
    } catch (error) {
      logger.error('Error updating batch inventory:', error);
      throw error;
    }
  }

  /**
   * Create sales ledger entries
   */
  async createSalesLedgerEntries(salesOrder) {
    try {
      // Sales revenue entry
      const salesEntry = new Ledger({
        transaction_date: salesOrder.order_date,
        transaction_type: 'SALE',
        account_head: 'SALES',
        store_id: salesOrder.store_id,
        description: `Sale to ${salesOrder.customer_name}`,
        reference_number: salesOrder.order_number,
        reference_type: 'INVOICE',
        debit_amount: 0,
        credit_amount: salesOrder.total_amount,
        customer_id: salesOrder.customer_id,
        customer_name: salesOrder.customer_name,
        payment_method: salesOrder.payment_method,
        status: 'PENDING',
        created_by: salesOrder.sales_person_id
      });
      
      await salesEntry.save();
      
      // Cash/Bank entry
      const paymentEntry = new Ledger({
        transaction_date: salesOrder.payment_date || salesOrder.order_date,
        transaction_type: 'RECEIPT',
        account_head: salesOrder.payment_method === 'CASH' ? 'CASH' : 'BANK',
        store_id: salesOrder.store_id,
        description: `Payment received from ${salesOrder.customer_name}`,
        reference_number: salesOrder.order_number,
        reference_type: 'RECEIPT',
        debit_amount: salesOrder.total_amount,
        credit_amount: 0,
        customer_id: salesOrder.customer_id,
        customer_name: salesOrder.customer_name,
        payment_method: salesOrder.payment_method,
        payment_reference: salesOrder.payment_reference,
        status: 'PENDING',
        created_by: salesOrder.sales_person_id
      });
      
      await paymentEntry.save();
      
      return { salesEntry, paymentEntry };
    } catch (error) {
      logger.error('Error creating sales ledger entries:', error);
      throw error;
    }
  }

  /**
   * Get sales orders with filtering
   */
  async getSalesOrders(filters = {}) {
    try {
      const {
        store_id,
        customer_id,
        status,
        payment_status,
        date_from,
        date_to,
        page = 1,
        limit = 10
      } = filters;
      
      const query = {};
      if (store_id) query.store_id = store_id;
      if (customer_id) query.customer_id = customer_id;
      if (status) query.status = status;
      if (payment_status) query.payment_status = payment_status;
      if (date_from || date_to) {
        query.order_date = {};
        if (date_from) query.order_date.$gte = new Date(date_from);
        if (date_to) query.order_date.$lte = new Date(date_to);
      }
      
      const orders = await SalesOrder.find(query)
        .populate('customer_id', 'full_name phone email')
        .populate('store_id', 'name address')
        .populate('sales_person_id', 'name email')
        .sort({ order_date: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await SalesOrder.countDocuments(query);
      
      return {
        orders,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_records: total
        }
      };
    } catch (error) {
      logger.error('Error getting sales orders:', error);
      throw error;
    }
  }

  /**
   * Create prescription
   */
  async createPrescription(prescriptionData, createdBy) {
    try {
      const prescription = new Prescription({
        ...prescriptionData,
        created_by: createdBy
      });
      
      await prescription.save();
      
      logger.info(`Prescription created: ${prescription.prescription_number}`);
      return prescription;
    } catch (error) {
      logger.error('Error creating prescription:', error);
      throw error;
    }
  }

  /**
   * Get prescriptions with filtering
   */
  async getPrescriptions(filters = {}) {
    try {
      const {
        store_id,
        customer_id,
        status,
        date_from,
        date_to,
        page = 1,
        limit = 10
      } = filters;
      
      const query = {};
      if (store_id) query.store_id = store_id;
      if (customer_id) query.customer_id = customer_id;
      if (status) query.status = status;
      if (date_from || date_to) {
        query.prescription_date = {};
        if (date_from) query.prescription_date.$gte = new Date(date_from);
        if (date_to) query.prescription_date.$lte = new Date(date_to);
      }
      
      const prescriptions = await Prescription.find(query)
        .populate('customer_id', 'full_name phone email')
        .populate('store_id', 'name address')
        .populate('created_by', 'name email')
        .sort({ prescription_date: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await Prescription.countDocuments(query);
      
      return {
        prescriptions,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_records: total
        }
      };
    } catch (error) {
      logger.error('Error getting prescriptions:', error);
      throw error;
    }
  }

  /**
   * Get sales dashboard data
   */
  async getSalesDashboard(store_id = null, period = null) {
    try {
      const filter = {};
      if (store_id) filter.store_id = store_id;
      if (period) {
        filter.order_date = {
          $gte: period.start,
          $lte: period.end
        };
      }
      
      const dashboard = await SalesOrder.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            total_orders: { $sum: 1 },
            total_revenue: { $sum: '$total_amount' },
            average_order_value: { $avg: '$total_amount' },
            total_items_sold: { $sum: { $sum: '$items.quantity' } }
          }
        }
      ]);
      
      const customerStats = await Customer.aggregate([
        { $match: { is_active: true } },
        {
          $group: {
            _id: null,
            total_customers: { $sum: 1 },
            new_customers: {
              $sum: {
                $cond: [
                  { $gte: ['$created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);
      
      return {
        sales: dashboard[0] || {
          total_orders: 0,
          total_revenue: 0,
          average_order_value: 0,
          total_items_sold: 0
        },
        customers: customerStats[0] || {
          total_customers: 0,
          new_customers: 0
        }
      };
    } catch (error) {
      logger.error('Error getting sales dashboard:', error);
      throw error;
    }
  }

  /**
   * Create manual sales entry (temporary entry without strict inventory validation)
   * This is for temporary sales entries that may not have full product/inventory integration
   */
  async createManualSalesEntry(orderData, createdBy) {
    try {
      const {
        customer_name,
        customer_phone,
        customer_email,
        items,
        store_id,
        payment_method = 'CASH',
        payment_status = 'PAID',
        notes,
        special_instructions
      } = orderData;

      // Validate required fields
      if (!customer_name) {
        throw new Error('Customer name is required');
      }
      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new Error('At least one item is required');
      }
      if (!store_id) {
        throw new Error('Store ID is required');
      }

      // Process items - allow manual entry without strict product validation
      const processedItems = items.map(item => {
        const {
          product_name,
          sku,
          quantity,
          unit_price,
          discount_percentage = 0,
          tax_rate = 0
        } = item;

        if (!product_name || !quantity || !unit_price) {
          throw new Error('Item must have product_name, quantity, and unit_price');
        }

        const discountAmount = (unit_price * quantity * discount_percentage) / 100;
        const taxableAmount = (unit_price * quantity) - discountAmount;
        const taxAmount = (taxableAmount * tax_rate) / 100;
        const lineTotal = taxableAmount + taxAmount;

        return {
          product_name,
          sku: sku || `MANUAL-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          quantity,
          unit_price,
          discount_percentage,
          discount_amount: discountAmount,
          tax_rate,
          tax_amount: taxAmount,
          line_total: lineTotal
        };
      });

      // Calculate totals
      const subtotal = processedItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      const total_discount = processedItems.reduce((sum, item) => sum + item.discount_amount, 0);
      const total_tax = processedItems.reduce((sum, item) => sum + item.tax_amount, 0);
      const shipping_charges = orderData.shipping_charges || 0;
      const total_amount = subtotal - total_discount + total_tax + shipping_charges;

      // Create or find customer (simplified - just use name/phone)
      let customer = null;
      if (customer_phone) {
        customer = await Customer.findOne({ phone: customer_phone });
      }
      
      if (!customer) {
        // Create a simple customer record for manual entry
        customer = new Customer({
          full_name: customer_name,
          phone: customer_phone || `MANUAL-PHONE-${Date.now()}`,
          email: customer_email,
          customer_id: `MANUAL-${Date.now()}`,
          is_active: true,
          created_by: createdBy
        });
        await customer.save();
      }

      // Create sales order with manual entry flag
      // Note: customer is always created above, so customer._id should always exist
      const salesOrder = new SalesOrder({
        order_date: orderData.order_date || new Date(),
        store_id: store_id,
        customer_id: customer._id,
        customer_name: customer_name,
        customer_phone: customer_phone,
        customer_email: customer_email,
        items: processedItems,
        subtotal,
        total_discount,
        total_tax,
        shipping_charges,
        total_amount,
        payment_method,
        payment_status,
        payment_reference: orderData.payment_reference,
        payment_date: payment_status === 'PAID' ? (orderData.payment_date || new Date()) : null,
        status: 'CONFIRMED',
        delivery_type: orderData.delivery_type || 'PICKUP',
        delivery_address: orderData.delivery_address,
        special_instructions,
        notes: notes || 'Manual sales entry - temporary',
        sales_person_id: createdBy,
        sales_person_name: orderData.sales_person_name || 'Manual Entry'
      });

      await salesOrder.save();

      logger.info(`Manual sales entry created: ${salesOrder.order_number}`);
      return salesOrder;
    } catch (error) {
      logger.error('Error creating manual sales entry:', error);
      throw error;
    }
  }
}

module.exports = new SalesService();
