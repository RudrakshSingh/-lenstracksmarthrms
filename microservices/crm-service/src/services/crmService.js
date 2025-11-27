const Customer = require('../models/Customer.model');
const Family = require('../models/Family.model');
const Interaction = require('../models/Interaction.model');
const LoyaltyRule = require('../models/LoyaltyRule.model');
const LoyaltyTxn = require('../models/LoyaltyTxn.model');
const WalletTxn = require('../models/WalletTxn.model');
const SubscriptionPlan = require('../models/SubscriptionPlan.model');
const Subscription = require('../models/Subscription.model');
const Prescription = require('../models/Prescription.model');
const ContactLensPlan = require('../models/ContactLensPlan.model');
const Ticket = require('../models/Ticket.model');
const logger = require('../config/logger');

class CRMService {
  // Customer 360° View
  async getCustomer360(customerId) {
    try {
      const customer = await Customer.findById(customerId)
        .populate('primary_store_id', 'name address')
        .populate('subscription_id')
        .lean();

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Get prescriptions
      const prescriptions = await Prescription.find({ customer_id: customerId })
        .sort({ issued_at: -1 })
        .limit(5)
        .lean();

      // Get contact lens plans
      const clPlans = await ContactLensPlan.find({ customer_id: customerId })
        .sort({ last_purchase_at: -1 })
        .lean();

      // Get recent interactions
      const interactions = await Interaction.find({ customer_id: customerId })
        .sort({ created_at: -1 })
        .limit(10)
        .lean();

      // Get loyalty transactions
      const loyaltyTxns = await LoyaltyTxn.find({ customer_id: customerId })
        .sort({ created_at: -1 })
        .limit(10)
        .lean();

      // Get wallet transactions
      const walletTxns = await WalletTxn.find({ customer_id: customerId })
        .sort({ created_at: -1 })
        .limit(10)
        .lean();

      // Get active tickets
      const tickets = await Ticket.find({ 
        customer_id: customerId,
        status: { $in: ['OPEN', 'IN_PROGRESS', 'PENDING'] }
      })
        .sort({ created_at: -1 })
        .lean();

      // Get family info if exists
      let family = null;
      if (customer.family_id) {
        family = await Family.findOne({ family_id: customer.family_id })
          .populate('members.customer_id', 'name phone email tier loyalty_points')
          .lean();
      }

      return {
        customer,
        prescriptions,
        clPlans,
        interactions,
        loyaltyTxns,
        walletTxns,
        tickets,
        family
      };
    } catch (error) {
      logger.error('Error getting customer 360', { error: error.message, customerId });
      throw error;
    }
  }

  // Create/Update Customer
  async createCustomer(customerData) {
    try {
      const customer = new Customer(customerData);
      await customer.save();
      
      logger.info('Customer created', { customer_id: customer.customer_id });
      return customer;
    } catch (error) {
      logger.error('Error creating customer', { error: error.message });
      throw error;
    }
  }

  async updateCustomer(customerId, updateData) {
    try {
      const customer = await Customer.findByIdAndUpdate(
        customerId,
        { ...updateData, updated_at: new Date() },
        { new: true, runValidators: true }
      );

      if (!customer) {
        throw new Error('Customer not found');
      }

      logger.info('Customer updated', { customer_id: customer.customer_id });
      return customer;
    } catch (error) {
      logger.error('Error updating customer', { error: error.message, customerId });
      throw error;
    }
  }

  // Family Management
  async createFamily(headCustomerId, familyData) {
    try {
      const family = new Family({
        ...familyData,
        head_customer_id: headCustomerId
      });
      await family.save();

      // Update customer with family_id
      await Customer.findByIdAndUpdate(headCustomerId, {
        family_id: family.family_id
      });

      logger.info('Family created', { family_id: family.family_id });
      return family;
    } catch (error) {
      logger.error('Error creating family', { error: error.message });
      throw error;
    }
  }

  async addFamilyMember(familyId, customerId, relationship = 'other') {
    try {
      const family = await Family.findOne({ family_id: familyId });
      if (!family) {
        throw new Error('Family not found');
      }

      family.members.push({
        customer_id: customerId,
        relationship
      });

      await family.save();

      // Update customer with family_id
      await Customer.findByIdAndUpdate(customerId, {
        family_id: familyId
      });

      logger.info('Family member added', { family_id: familyId, customer_id: customerId });
      return family;
    } catch (error) {
      logger.error('Error adding family member', { error: error.message });
      throw error;
    }
  }

  // Communication Management
  async sendMessage(messageData) {
    try {
      const { customer_id, channel, template_id, variables = {} } = messageData;

      // Check customer consent
      const customer = await Customer.findById(customer_id);
      if (!customer) {
        throw new Error('Customer not found');
      }

      if (!customer.consents[channel]) {
        throw new Error(`Customer has not consented to ${channel} communications`);
      }

      // Create interaction record
      const interaction = new Interaction({
        ix_id: `IX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        customer_id,
        channel,
        direction: 'out',
        template_id,
        content_hash: JSON.stringify(variables),
        sent_at: new Date(),
        status: 'SENT'
      });

      await interaction.save();

      logger.info('Message sent', { 
        customer_id, 
        channel, 
        interaction_id: interaction.ix_id 
      });

      return interaction;
    } catch (error) {
      logger.error('Error sending message', { error: error.message });
      throw error;
    }
  }

  // Loyalty Management
  async getCurrentLoyaltyRule() {
    try {
      const rule = await LoyaltyRule.findOne({
        is_active: true,
        effective_from: { $lte: new Date() },
        $or: [
          { effective_to: { $gte: new Date() } },
          { effective_to: null }
        ]
      }).sort({ effective_from: -1 });

      return rule;
    } catch (error) {
      logger.error('Error getting current loyalty rule', { error: error.message });
      throw error;
    }
  }

  async earnLoyaltyPoints(customerId, orderId, items) {
    try {
      const rule = await this.getCurrentLoyaltyRule();
      if (!rule) {
        throw new Error('No active loyalty rule found');
      }

      const customer = await Customer.findById(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      let totalPoints = 0;
      let basePoints = 0;
      let tierBonus = 0;

      for (const item of items) {
        // Check exclusions
        const isExcluded = rule.earn.exclusions.categories.includes(item.category) ||
                          rule.earn.exclusions.brands.includes(item.brand) ||
                          rule.earn.exclusions.skus.includes(item.sku);

        if (isExcluded) continue;

        // Calculate base points
        const brandType = item.brand_type === 'inhouse' ? 'inhouse' : 'international';
        const pointsPer100 = rule.earn.base_per_100[brandType];
        const itemPoints = Math.floor((item.net_pre_tax / 100) * pointsPer100);
        
        basePoints += itemPoints;
      }

      // Apply tier bonus
      const tierBonusRate = rule.tier_bonus[customer.tier] || 0;
      tierBonus = Math.floor(basePoints * tierBonusRate);
      totalPoints = basePoints + tierBonus;

      // Apply invoice cap
      totalPoints = Math.min(totalPoints, rule.earn.invoice_point_cap);

      if (totalPoints > 0) {
        // Create loyalty transaction
        const loyaltyTxn = new LoyaltyTxn({
          txn_id: `LT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          customer_id,
          order_id: orderId,
          points: totalPoints,
          reason: 'earn',
          expires_at: new Date(Date.now() + (rule.expiry.months * 30 * 24 * 60 * 60 * 1000)),
          balance_after: customer.loyalty_points + totalPoints,
          meta: {
            tier_bonus: tierBonus,
            base_points: basePoints,
            invoice_amount: items.reduce((sum, item) => sum + item.net_pre_tax, 0)
          }
        });

        await loyaltyTxn.save();

        // Update customer points
        await Customer.findByIdAndUpdate(customerId, {
          loyalty_points: customer.loyalty_points + totalPoints
        });

        logger.info('Loyalty points earned', { 
          customer_id, 
          points: totalPoints,
          base_points: basePoints,
          tier_bonus: tierBonus
        });

        return {
          points_earned: totalPoints,
          base_points: basePoints,
          tier_bonus: tierBonus,
          balance_after: customer.loyalty_points + totalPoints
        };
      }

      return { points_earned: 0, base_points: 0, tier_bonus: 0, balance_after: customer.loyalty_points };
    } catch (error) {
      logger.error('Error earning loyalty points', { error: error.message });
      throw error;
    }
  }

  async burnLoyaltyPoints(customerId, orderId, pointsToBurn, items) {
    try {
      const rule = await this.getCurrentLoyaltyRule();
      if (!rule) {
        throw new Error('No active loyalty rule found');
      }

      const customer = await Customer.findById(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Check burn exclusions
      let burnableAmount = 0;
      for (const item of items) {
        const isExcluded = rule.burn.exclusions.categories.includes(item.category) ||
                          rule.burn.exclusions.brands.includes(item.brand) ||
                          rule.burn.exclusions.skus.includes(item.sku);

        if (!isExcluded) {
          burnableAmount += item.net_pre_tax;
        }
      }

      // Calculate max burnable points
      const maxBurnablePoints = Math.floor(burnableAmount * rule.burn.max_burn_pct);
      const maxBurnableRounded = Math.floor(maxBurnablePoints / rule.burn.step) * rule.burn.step;
      const actualBurnPoints = Math.min(pointsToBurn, maxBurnableRounded, customer.loyalty_points);

      if (actualBurnPoints > 0) {
        // Create loyalty transaction
        const loyaltyTxn = new LoyaltyTxn({
          txn_id: `LT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          customer_id,
          order_id: orderId,
          points: -actualBurnPoints,
          reason: 'burn',
          balance_after: customer.loyalty_points - actualBurnPoints,
          meta: {
            burn_percentage: (actualBurnPoints / burnableAmount) * 100,
            invoice_amount: burnableAmount
          }
        });

        await loyaltyTxn.save();

        // Update customer points
        await Customer.findByIdAndUpdate(customerId, {
          loyalty_points: customer.loyalty_points - actualBurnPoints
        });

        logger.info('Loyalty points burned', { 
          customer_id, 
          points_burned: actualBurnPoints,
          balance_after: customer.loyalty_points - actualBurnPoints
        });

        return {
          points_burned: actualBurnPoints,
          balance_after: customer.loyalty_points - actualBurnPoints
        };
      }

      return { points_burned: 0, balance_after: customer.loyalty_points };
    } catch (error) {
      logger.error('Error burning loyalty points', { error: error.message });
      throw error;
    }
  }

  // Wallet Management
  async creditWallet(customerId, amount, reason, reference) {
    try {
      const customer = await Customer.findById(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const walletTxn = new WalletTxn({
        txn_id: `WT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        customer_id,
        amount,
        reason,
        reference,
        balance_after: customer.wallet_balance + amount
      });

      await walletTxn.save();

      // Update customer wallet balance
      await Customer.findByIdAndUpdate(customerId, {
        wallet_balance: customer.wallet_balance + amount
      });

      logger.info('Wallet credited', { 
        customer_id, 
        amount, 
        balance_after: customer.wallet_balance + amount 
      });

      return {
        amount_credited: amount,
        balance_after: customer.wallet_balance + amount
      };
    } catch (error) {
      logger.error('Error crediting wallet', { error: error.message });
      throw error;
    }
  }

  async debitWallet(customerId, amount, reason, reference) {
    try {
      const customer = await Customer.findById(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      if (customer.wallet_balance < amount) {
        throw new Error('Insufficient wallet balance');
      }

      const walletTxn = new WalletTxn({
        txn_id: `WT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        customer_id,
        amount: -amount,
        reason,
        reference,
        balance_after: customer.wallet_balance - amount
      });

      await walletTxn.save();

      // Update customer wallet balance
      await Customer.findByIdAndUpdate(customerId, {
        wallet_balance: customer.wallet_balance - amount
      });

      logger.info('Wallet debited', { 
        customer_id, 
        amount, 
        balance_after: customer.wallet_balance - amount 
      });

      return {
        amount_debited: amount,
        balance_after: customer.wallet_balance - amount
      };
    } catch (error) {
      logger.error('Error debiting wallet', { error: error.message });
      throw error;
    }
  }

  // Subscription Management
  async createSubscription(customerId, planId) {
    try {
      const plan = await SubscriptionPlan.findById(planId);
      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      const customer = await Customer.findById(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (plan.cycle === '6m' ? 6 : 12));

      const subscription = new Subscription({
        subscription_id: `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        customer_id,
        plan_id: planId,
        start_at: startDate,
        end_at: endDate,
        credit_balance: plan.credit_amount
      });

      await subscription.save();

      // Update customer subscription
      await Customer.findByIdAndUpdate(customerId, {
        subscription_id: subscription._id
      });

      logger.info('Subscription created', { 
        customer_id, 
        subscription_id: subscription.subscription_id,
        plan_name: plan.name
      });

      return subscription;
    } catch (error) {
      logger.error('Error creating subscription', { error: error.message });
      throw error;
    }
  }

  async redeemSubscription(customerId, amount, category, reference) {
    try {
      const customer = await Customer.findById(customerId);
      if (!customer || !customer.subscription_id) {
        throw new Error('Customer subscription not found');
      }

      const subscription = await Subscription.findById(customer.subscription_id);
      if (!subscription || subscription.status !== 'ACTIVE') {
        throw new Error('Active subscription not found');
      }

      if (subscription.credit_balance < amount) {
        throw new Error('Insufficient subscription credit');
      }

      // Check redemption rules
      const plan = await SubscriptionPlan.findById(subscription.plan_id);
      if (plan.redemption_rules.categories && !plan.redemption_rules.categories.includes(category)) {
        throw new Error('Category not eligible for redemption');
      }

      // Update subscription credit
      subscription.credit_balance -= amount;
      await subscription.save();

      logger.info('Subscription redeemed', { 
        customer_id, 
        amount, 
        remaining_credit: subscription.credit_balance
      });

      return {
        amount_redeemed: amount,
        remaining_credit: subscription.credit_balance
      };
    } catch (error) {
      logger.error('Error redeeming subscription', { error: error.message });
      throw error;
    }
  }

  // Analytics
  async getCustomerAnalytics(customerId) {
    try {
      const customer = await Customer.findById(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Calculate CLV (Customer Lifetime Value)
      const loyaltyTxns = await LoyaltyTxn.find({ customer_id: customerId, reason: 'earn' });
      const totalEarned = loyaltyTxns.reduce((sum, txn) => sum + txn.points, 0);

      // Calculate engagement score
      const interactions = await Interaction.find({ customer_id: customerId });
      const recentInteractions = interactions.filter(ix => 
        new Date(ix.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );

      const engagementScore = Math.min(100, recentInteractions.length * 10);

      // Calculate next best action
      let nextBestAction = 'general_engagement';
      if (customer.cl_user && customer.last_purchase_at) {
        const daysSinceLastPurchase = Math.floor((Date.now() - customer.last_purchase_at) / (24 * 60 * 60 * 1000));
        if (daysSinceLastPurchase > 90) {
          nextBestAction = 'cl_refill_reminder';
        }
      }

      if (customer.last_eye_test_at) {
        const daysSinceLastTest = Math.floor((Date.now() - customer.last_eye_test_at) / (24 * 60 * 60 * 1000));
        if (daysSinceLastTest > 365) {
          nextBestAction = 'eye_test_recall';
        }
      }

      return {
        clv: totalEarned,
        engagement_score: engagementScore,
        next_best_action: nextBestAction,
        tier: customer.tier,
        loyalty_points: customer.loyalty_points,
        wallet_balance: customer.wallet_balance,
        last_purchase: customer.last_purchase_at,
        last_eye_test: customer.last_eye_test_at
      };
    } catch (error) {
      logger.error('Error getting customer analytics', { error: error.message });
      throw error;
    }
  }

  // Customer CRUD operations
  async getCustomers(query = {}) {
    try {
      const { page = 1, limit = 10, search, status } = query;
      const filter = {};
      
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (status) {
        filter.status = status;
      }
      
      const customers = await Customer.find(filter)
        .populate('primary_store_id', 'name address')
        .populate('subscription_id')
        .sort({ created_at: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await Customer.countDocuments(filter);
      
      return {
        customers,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      };
    } catch (error) {
      logger.error('Error getting customers', { error: error.message });
      throw error;
    }
  }

  async getCustomer(customerId) {
    try {
      const customer = await Customer.findById(customerId)
        .populate('primary_store_id', 'name address')
        .populate('subscription_id');
      
      if (!customer) {
        throw new Error('Customer not found');
      }
      
      return customer;
    } catch (error) {
      logger.error('Error getting customer', { error: error.message });
      throw error;
    }
  }

  async deleteCustomer(customerId) {
    try {
      const customer = await Customer.findByIdAndDelete(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }
      return customer;
    } catch (error) {
      logger.error('Error deleting customer', { error: error.message });
      throw error;
    }
  }

  // Lead CRUD operations
  async getLeads(query = {}) {
    try {
      const { page = 1, limit = 10, search, status } = query;
      const filter = {};
      
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (status) {
        filter.status = status;
      }
      
      const leads = await Customer.find({ ...filter, is_lead: true })
        .populate('primary_store_id', 'name address')
        .sort({ created_at: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await Customer.countDocuments({ ...filter, is_lead: true });
      
      return {
        leads,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      };
    } catch (error) {
      logger.error('Error getting leads', { error: error.message });
      throw error;
    }
  }

  async createLead(leadData) {
    try {
      const lead = new Customer({
        ...leadData,
        is_lead: true,
        status: 'new'
      });
      
      await lead.save();
      return lead;
    } catch (error) {
      logger.error('Error creating lead', { error: error.message });
      throw error;
    }
  }

  async getLead(leadId) {
    try {
      const lead = await Customer.findOne({ _id: leadId, is_lead: true })
        .populate('primary_store_id', 'name address');
      
      if (!lead) {
        throw new Error('Lead not found');
      }
      
      return lead;
    } catch (error) {
      logger.error('Error getting lead', { error: error.message });
      throw error;
    }
  }

  async updateLead(leadId, updateData) {
    try {
      const lead = await Customer.findOneAndUpdate(
        { _id: leadId, is_lead: true },
        updateData,
        { new: true }
      ).populate('primary_store_id', 'name address');
      
      if (!lead) {
        throw new Error('Lead not found');
      }
      
      return lead;
    } catch (error) {
      logger.error('Error updating lead', { error: error.message });
      throw error;
    }
  }

  async deleteLead(leadId) {
    try {
      const lead = await Customer.findOneAndDelete({ _id: leadId, is_lead: true });
      if (!lead) {
        throw new Error('Lead not found');
      }
      return lead;
    } catch (error) {
      logger.error('Error deleting lead', { error: error.message });
      throw error;
    }
  }

  async convertLead(leadId, convertData) {
    try {
      const lead = await Customer.findOne({ _id: leadId, is_lead: true });
      
      if (!lead) {
        throw new Error('Lead not found');
      }

      // Convert lead to customer
      lead.is_lead = false;
      lead.status = 'active';
      if (convertData.customer_segment) {
        lead.customer_segment = convertData.customer_segment;
      }
      
      await lead.save();

      // Create opportunity if requested
      let opportunity = null;
      if (convertData.create_opportunity) {
        const Opportunity = require('../models/Opportunity.model');
        opportunity = new Opportunity({
          name: convertData.opportunity_name || `Opportunity for ${lead.name}`,
          customer_id: lead._id,
          lead_id: leadId,
          stage: 'PROSPECTING',
          value: convertData.opportunity_value || 0,
          source: convertData.source || 'LEAD_CONVERSION',
          assigned_to: convertData.assigned_to,
          created_by: convertData.created_by
        });
        await opportunity.save();
      }

      return {
        customer: lead,
        opportunity: opportunity
      };
    } catch (error) {
      logger.error('Error converting lead', { error: error.message });
      throw error;
    }
  }

  // Interaction CRUD operations
  async getInteractions(query = {}) {
    try {
      const { page = 1, limit = 10, customer_id, type } = query;
      const filter = {};
      
      if (customer_id) {
        filter.customer_id = customer_id;
      }
      
      if (type) {
        filter.type = type;
      }
      
      const interactions = await Interaction.find(filter)
        .populate('customer_id', 'name phone email')
        .populate('created_by', 'name email')
        .sort({ created_at: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await Interaction.countDocuments(filter);
      
      return {
        interactions,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      };
    } catch (error) {
      logger.error('Error getting interactions', { error: error.message });
      throw error;
    }
  }

  async createInteraction(interactionData) {
    try {
      const interaction = new Interaction(interactionData);
      await interaction.save();
      
      return await Interaction.findById(interaction._id)
        .populate('customer_id', 'name phone email')
        .populate('created_by', 'name email');
    } catch (error) {
      logger.error('Error creating interaction', { error: error.message });
      throw error;
    }
  }

  async getInteraction(interactionId) {
    try {
      const interaction = await Interaction.findById(interactionId)
        .populate('customer_id', 'name phone email')
        .populate('created_by', 'name email');
      
      if (!interaction) {
        throw new Error('Interaction not found');
      }
      
      return interaction;
    } catch (error) {
      logger.error('Error getting interaction', { error: error.message });
      throw error;
    }
  }

  async updateInteraction(interactionId, updateData) {
    try {
      const interaction = await Interaction.findByIdAndUpdate(
        interactionId,
        updateData,
        { new: true }
      ).populate('customer_id', 'name phone email')
       .populate('created_by', 'name email');
      
      if (!interaction) {
        throw new Error('Interaction not found');
      }
      
      return interaction;
    } catch (error) {
      logger.error('Error updating interaction', { error: error.message });
      throw error;
    }
  }

  async deleteInteraction(interactionId) {
    try {
      const interaction = await Interaction.findByIdAndDelete(interactionId);
      if (!interaction) {
        throw new Error('Interaction not found');
      }
      return interaction;
    } catch (error) {
      logger.error('Error deleting interaction', { error: error.message });
      throw error;
    }
  }
}

module.exports = new CRMService();
