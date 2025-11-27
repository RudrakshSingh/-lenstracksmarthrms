const Inventory = require('../models/Inventory.model');
const StockTransfer = require('../models/StockTransfer.model');
const ProductMaster = require('../models/ProductMaster.model');
const logger = require('../config/logger');

class StockService {
  /**
   * Get stock movements
   */
  async getStockMovements(filters = {}, page = 1, limit = 25) {
    try {
      const skip = (page - 1) * limit;
      const query = {};

      // Apply filters
      if (filters.store_id) {
        query.$or = [
          { from_store_id: filters.store_id },
          { to_store_id: filters.store_id }
        ];
      }
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.transfer_type) {
        query.transfer_type = filters.transfer_type;
      }
      if (filters.date_from || filters.date_to) {
        query.created_at = {};
        if (filters.date_from) {
          query.created_at.$gte = new Date(filters.date_from);
        }
        if (filters.date_to) {
          query.created_at.$lte = new Date(filters.date_to);
        }
      }

      const [movements, total] = await Promise.all([
        StockTransfer.find(query)
          .populate('from_store_id', 'name code')
          .populate('to_store_id', 'name code')
          .populate('requested_by', 'firstName lastName email')
          .populate('approved_by', 'firstName lastName email')
          .populate('items.product_variant_id', 'name sku')
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        StockTransfer.countDocuments(query)
      ]);

      return {
        data: movements,
        total,
        page,
        limit
      };
    } catch (error) {
      logger.error('Error in getStockMovements service', { error: error.message });
      throw error;
    }
  }

  /**
   * Adjust stock
   */
  async adjustStock(adjustmentData, adjustedBy) {
    try {
      const { product_id, store_id, quantity, reason, type } = adjustmentData;

      // Find inventory item
      const inventory = await Inventory.findOne({ 
        _id: product_id,
        store_id: store_id 
      });

      if (!inventory) {
        const error = new Error('Inventory item not found');
        error.statusCode = 404;
        throw error;
      }

      // Adjust quantity
      const oldQuantity = inventory.quantity;
      if (type === 'INCREASE') {
        inventory.quantity += quantity;
      } else if (type === 'DECREASE') {
        if (inventory.quantity < quantity) {
          const error = new Error('Insufficient stock');
          error.statusCode = 400;
          throw error;
        }
        inventory.quantity -= quantity;
      } else {
        inventory.quantity = quantity;
      }

      await inventory.save();

      // Create stock transfer record for audit
      const transfer = new StockTransfer({
        transfer_type: 'MANUAL',
        from_store_id: store_id,
        to_store_id: store_id, // Same store for adjustments
        items: [{
          product_variant_id: product_id,
          quantity: Math.abs(inventory.quantity - oldQuantity),
          reason: reason || `Stock adjustment: ${type}`,
          unit_cost: inventory.unit_price
        }],
        status: 'APPROVED',
        requested_by: adjustedBy,
        approved_by: adjustedBy,
        approved_at: new Date(),
        notes: `Stock adjustment: ${oldQuantity} -> ${inventory.quantity}. Reason: ${reason || 'Manual adjustment'}`
      });

      await transfer.save();

      return {
        inventory: inventory.toObject(),
        adjustment: {
          oldQuantity,
          newQuantity: inventory.quantity,
          difference: inventory.quantity - oldQuantity,
          type
        }
      };
    } catch (error) {
      logger.error('Error in adjustStock service', { error: error.message });
      throw error;
    }
  }

  /**
   * Get stock summary
   */
  async getStockSummary(filters = {}) {
    try {
      const query = {};

      if (filters.store_id) {
        query.store_id = filters.store_id;
      }
      if (filters.category) {
        query.category = filters.category;
      }

      const [
        totalItems,
        lowStockItems,
        outOfStockItems,
        totalValue,
        byCategory
      ] = await Promise.all([
        Inventory.countDocuments(query),
        Inventory.countDocuments({
          ...query,
          $expr: { $lt: ['$quantity', '$min_stock_level'] }
        }),
        Inventory.countDocuments({
          ...query,
          quantity: 0
        }),
        Inventory.aggregate([
          { $match: query },
          { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$unit_price'] } } } }
        ]),
        Inventory.aggregate([
          { $match: query },
          { $group: { 
            _id: '$category', 
            count: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' },
            totalValue: { $sum: { $multiply: ['$quantity', '$unit_price'] } }
          }},
          { $sort: { count: -1 } }
        ])
      ]);

      return {
        totalItems,
        lowStockItems,
        outOfStockItems,
        totalValue: totalValue[0]?.total || 0,
        byCategory: byCategory.reduce((acc, item) => {
          acc[item._id] = {
            count: item.count,
            totalQuantity: item.totalQuantity,
            totalValue: item.totalValue
          };
          return acc;
        }, {})
      };
    } catch (error) {
      logger.error('Error in getStockSummary service', { error: error.message });
      throw error;
    }
  }

  /**
   * Get low stock items
   */
  async getLowStockItems(filters = {}, page = 1, limit = 25) {
    try {
      const skip = (page - 1) * limit;
      const query = {};

      if (filters.store_id) {
        query.store_id = filters.store_id;
      }
      if (filters.category) {
        query.category = filters.category;
      }

      // Find items where quantity is below min_stock_level
      query.$expr = { $lt: ['$quantity', '$min_stock_level'] };

      const [items, total] = await Promise.all([
        Inventory.find(query)
          .populate('supplier_id', 'name contact')
          .sort({ quantity: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Inventory.countDocuments(query)
      ]);

      // Add stock status
      const itemsWithStatus = items.map(item => ({
        ...item,
        stockStatus: item.quantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
        reorderQuantity: Math.max(0, item.min_stock_level - item.quantity)
      }));

      return {
        data: itemsWithStatus,
        total,
        page,
        limit
      };
    } catch (error) {
      logger.error('Error in getLowStockItems service', { error: error.message });
      throw error;
    }
  }
}

module.exports = new StockService();

