const crmService = require('../services/crmService');
const logger = require('../config/logger');

class CRMController {
  // Customer 360° View
  async getCustomer360(req, res) {
    try {
      const { id } = req.params;
      const customer360 = await crmService.getCustomer360(id);
      
      res.json({
        success: true,
        data: customer360
      });
    } catch (error) {
      logger.error('Error getting customer 360', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Customer Management
  async createCustomer(req, res) {
    try {
      const customer = await crmService.createCustomer(req.body);
      
      res.status(201).json({
        success: true,
        data: customer
      });
    } catch (error) {
      logger.error('Error creating customer', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateCustomer(req, res) {
    try {
      const { id } = req.params;
      const customer = await crmService.updateCustomer(id, req.body);
      
      res.json({
        success: true,
        data: customer
      });
    } catch (error) {
      logger.error('Error updating customer', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Family Management
  async createFamily(req, res) {
    try {
      const { head_customer_id, ...familyData } = req.body;
      const family = await crmService.createFamily(head_customer_id, familyData);
      
      res.status(201).json({
        success: true,
        data: family
      });
    } catch (error) {
      logger.error('Error creating family', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async addFamilyMember(req, res) {
    try {
      const { family_id } = req.params;
      const { customer_id, relationship } = req.body;
      
      const family = await crmService.addFamilyMember(family_id, customer_id, relationship);
      
      res.json({
        success: true,
        data: family
      });
    } catch (error) {
      logger.error('Error adding family member', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Communication
  async sendMessage(req, res) {
    try {
      const { customer_id, channel, template_id, variables } = req.body;
      
      const interaction = await crmService.sendMessage({
        customer_id,
        channel,
        template_id,
        variables
      });
      
      res.json({
        success: true,
        data: interaction
      });
    } catch (error) {
      logger.error('Error sending message', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Loyalty Management
  async getCurrentLoyaltyRule(req, res) {
    try {
      const rule = await crmService.getCurrentLoyaltyRule();
      
      res.json({
        success: true,
        data: rule
      });
    } catch (error) {
      logger.error('Error getting loyalty rule', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async earnLoyaltyPoints(req, res) {
    try {
      const { customer_id, order_id, items } = req.body;
      
      const result = await crmService.earnLoyaltyPoints(customer_id, order_id, items);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error earning loyalty points', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async burnLoyaltyPoints(req, res) {
    try {
      const { customer_id, order_id, points_to_burn, items } = req.body;
      
      const result = await crmService.burnLoyaltyPoints(customer_id, order_id, points_to_burn, items);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error burning loyalty points', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Wallet Management
  async creditWallet(req, res) {
    try {
      const { customer_id, amount, reason, reference } = req.body;
      
      const result = await crmService.creditWallet(customer_id, amount, reason, reference);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error crediting wallet', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async debitWallet(req, res) {
    try {
      const { customer_id, amount, reason, reference } = req.body;
      
      const result = await crmService.debitWallet(customer_id, amount, reason, reference);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error debiting wallet', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Subscription Management
  async createSubscription(req, res) {
    try {
      const { customer_id, plan_id } = req.body;
      
      const subscription = await crmService.createSubscription(customer_id, plan_id);
      
      res.status(201).json({
        success: true,
        data: subscription
      });
    } catch (error) {
      logger.error('Error creating subscription', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async redeemSubscription(req, res) {
    try {
      const { customer_id, amount, category, reference } = req.body;
      
      const result = await crmService.redeemSubscription(customer_id, amount, category, reference);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error redeeming subscription', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Analytics
  async getCustomerAnalytics(req, res) {
    try {
      const { id } = req.params;
      
      const analytics = await crmService.getCustomerAnalytics(id);
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Error getting customer analytics', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Convert Lead to Customer
  async convertLead(req, res) {
    try {
      const { id } = req.params;
      const result = await crmService.convertLead(id, {
        ...req.body,
        created_by: req.user.id
      });
      
      res.json({
        success: true,
        data: result,
        message: 'Lead converted to customer successfully'
      });
    } catch (error) {
      logger.error('Error converting lead', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Customer CRUD operations
  async getCustomers(req, res) {
    try {
      const customers = await crmService.getCustomers(req.query);
      res.json({
        success: true,
        data: customers
      });
    } catch (error) {
      logger.error('Error getting customers', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getCustomer(req, res) {
    try {
      const { id } = req.params;
      const customer = await crmService.getCustomer(id);
      res.json({
        success: true,
        data: customer
      });
    } catch (error) {
      logger.error('Error getting customer', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async deleteCustomer(req, res) {
    try {
      const { id } = req.params;
      await crmService.deleteCustomer(id);
      res.json({
        success: true,
        message: 'Customer deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting customer', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Lead CRUD operations
  async getLeads(req, res) {
    try {
      const leads = await crmService.getLeads(req.query);
      res.json({
        success: true,
        data: leads
      });
    } catch (error) {
      logger.error('Error getting leads', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async createLead(req, res) {
    try {
      const leadData = { ...req.body, created_by: req.user.userId };
      const lead = await crmService.createLead(leadData);
      res.status(201).json({
        success: true,
        data: lead
      });
    } catch (error) {
      logger.error('Error creating lead', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getLead(req, res) {
    try {
      const { id } = req.params;
      const lead = await crmService.getLead(id);
      res.json({
        success: true,
        data: lead
      });
    } catch (error) {
      logger.error('Error getting lead', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateLead(req, res) {
    try {
      const { id } = req.params;
      const lead = await crmService.updateLead(id, req.body);
      res.json({
        success: true,
        data: lead
      });
    } catch (error) {
      logger.error('Error updating lead', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async deleteLead(req, res) {
    try {
      const { id } = req.params;
      await crmService.deleteLead(id);
      res.json({
        success: true,
        message: 'Lead deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting lead', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Interaction CRUD operations
  async getInteractions(req, res) {
    try {
      const interactions = await crmService.getInteractions(req.query);
      res.json({
        success: true,
        data: interactions
      });
    } catch (error) {
      logger.error('Error getting interactions', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async createInteraction(req, res) {
    try {
      const interactionData = { ...req.body, created_by: req.user.userId };
      const interaction = await crmService.createInteraction(interactionData);
      res.status(201).json({
        success: true,
        data: interaction
      });
    } catch (error) {
      logger.error('Error creating interaction', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getInteraction(req, res) {
    try {
      const { id } = req.params;
      const interaction = await crmService.getInteraction(id);
      res.json({
        success: true,
        data: interaction
      });
    } catch (error) {
      logger.error('Error getting interaction', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateInteraction(req, res) {
    try {
      const { id } = req.params;
      const interaction = await crmService.updateInteraction(id, req.body);
      res.json({
        success: true,
        data: interaction
      });
    } catch (error) {
      logger.error('Error updating interaction', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async deleteInteraction(req, res) {
    try {
      const { id } = req.params;
      await crmService.deleteInteraction(id);
      res.json({
        success: true,
        message: 'Interaction deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting interaction', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new CRMController();
