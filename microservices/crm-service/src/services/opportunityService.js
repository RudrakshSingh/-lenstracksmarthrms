const Opportunity = require('../models/Opportunity.model');
const Customer = require('../models/Customer.model');
const logger = require('../config/logger');

class OpportunityService {
  /**
   * Get all opportunities with pagination and filters
   */
  async getOpportunities(filters = {}, page = 1, limit = 25) {
    try {
      const skip = (page - 1) * limit;
      const query = {};

      // Apply filters
      if (filters.stage) {
        query.stage = filters.stage;
      }
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.customer_id) {
        query.customer_id = filters.customer_id;
      }
      if (filters.assigned_to) {
        query.assigned_to = filters.assigned_to;
      }
      if (filters.store_id) {
        query.store_id = filters.store_id;
      }
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { opportunity_id: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const [opportunities, total] = await Promise.all([
        Opportunity.find(query)
          .populate('customer_id', 'name phone email')
          .populate('lead_id', 'name phone email')
          .populate('assigned_to', 'firstName lastName email')
          .populate('store_id', 'name code')
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Opportunity.countDocuments(query)
      ]);

      return {
        data: opportunities,
        total,
        page,
        limit
      };
    } catch (error) {
      logger.error('Error in getOpportunities service', { error: error.message });
      throw error;
    }
  }

  /**
   * Get opportunity by ID
   */
  async getOpportunityById(opportunityId) {
    try {
      const opportunity = await Opportunity.findById(opportunityId)
        .populate('customer_id', 'name phone email')
        .populate('lead_id', 'name phone email')
        .populate('assigned_to', 'firstName lastName email')
        .populate('store_id', 'name code')
        .populate('products.product_id', 'name sku price')
        .lean();

      if (!opportunity) {
        const error = new Error('Opportunity not found');
        error.statusCode = 404;
        throw error;
      }

      return opportunity;
    } catch (error) {
      logger.error('Error in getOpportunityById service', { error: error.message });
      throw error;
    }
  }

  /**
   * Create new opportunity
   */
  async createOpportunity(opportunityData, createdBy) {
    try {
      // Validate customer exists
      if (opportunityData.customer_id) {
        const customer = await Customer.findById(opportunityData.customer_id);
        if (!customer) {
          const error = new Error('Customer not found');
          error.statusCode = 400;
          throw error;
        }
      }

      const opportunity = new Opportunity({
        ...opportunityData,
        created_by: createdBy
      });

      await opportunity.save();

      return opportunity.toObject();
    } catch (error) {
      logger.error('Error in createOpportunity service', { error: error.message });
      throw error;
    }
  }

  /**
   * Update opportunity
   */
  async updateOpportunity(opportunityId, updateData, updatedBy) {
    try {
      const opportunity = await Opportunity.findById(opportunityId);

      if (!opportunity) {
        const error = new Error('Opportunity not found');
        error.statusCode = 404;
        throw error;
      }

      // Validate customer if being updated
      if (updateData.customer_id) {
        const customer = await Customer.findById(updateData.customer_id);
        if (!customer) {
          const error = new Error('Customer not found');
          error.statusCode = 400;
          throw error;
        }
      }

      Object.assign(opportunity, updateData);
      await opportunity.save();

      return opportunity.toObject();
    } catch (error) {
      logger.error('Error in updateOpportunity service', { error: error.message });
      throw error;
    }
  }

  /**
   * Close opportunity
   */
  async closeOpportunity(opportunityId, closeData, closedBy) {
    try {
      const opportunity = await Opportunity.findById(opportunityId);

      if (!opportunity) {
        const error = new Error('Opportunity not found');
        error.statusCode = 404;
        throw error;
      }

      opportunity.stage = closeData.reason === 'WON' ? 'CLOSED_WON' : 'CLOSED_LOST';
      opportunity.status = 'CLOSED';
      opportunity.close_reason = closeData.reason;
      opportunity.actual_close_date = new Date();
      opportunity.probability = closeData.reason === 'WON' ? 100 : 0;

      if (closeData.notes) {
        opportunity.notes.push({
          note: closeData.notes,
          created_by: closedBy,
          created_at: new Date()
        });
      }

      await opportunity.save();

      return opportunity.toObject();
    } catch (error) {
      logger.error('Error in closeOpportunity service', { error: error.message });
      throw error;
    }
  }

  /**
   * Get opportunity statistics
   */
  async getOpportunityStats(filters = {}) {
    try {
      const query = {};

      if (filters.store_id) {
        query.store_id = filters.store_id;
      }
      if (filters.assigned_to) {
        query.assigned_to = filters.assigned_to;
      }

      const [
        total,
        open,
        closedWon,
        closedLost,
        byStage,
        totalValue,
        wonValue,
        lostValue
      ] = await Promise.all([
        Opportunity.countDocuments(query),
        Opportunity.countDocuments({ ...query, status: 'OPEN' }),
        Opportunity.countDocuments({ ...query, stage: 'CLOSED_WON' }),
        Opportunity.countDocuments({ ...query, stage: 'CLOSED_LOST' }),
        Opportunity.aggregate([
          { $match: query },
          { $group: { _id: '$stage', count: { $sum: 1 } } }
        ]),
        Opportunity.aggregate([
          { $match: query },
          { $group: { _id: null, total: { $sum: '$value' } } }
        ]),
        Opportunity.aggregate([
          { $match: { ...query, stage: 'CLOSED_WON' } },
          { $group: { _id: null, total: { $sum: '$value' } } }
        ]),
        Opportunity.aggregate([
          { $match: { ...query, stage: 'CLOSED_LOST' } },
          { $group: { _id: null, total: { $sum: '$value' } } }
        ])
      ]);

      return {
        total,
        open,
        closedWon,
        closedLost,
        byStage: byStage.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        totalValue: totalValue[0]?.total || 0,
        wonValue: wonValue[0]?.total || 0,
        lostValue: lostValue[0]?.total || 0,
        winRate: closedWon + closedLost > 0 
          ? ((closedWon / (closedWon + closedLost)) * 100).toFixed(2) 
          : 0
      };
    } catch (error) {
      logger.error('Error in getOpportunityStats service', { error: error.message });
      throw error;
    }
  }
}

module.exports = new OpportunityService();

