const Invoice = require('../models/Invoice.model');
const logger = require('../config/logger');

class InvoiceService {
  /**
   * Get all invoices with pagination and filters
   */
  async getInvoices(filters = {}, page = 1, limit = 25) {
    try {
      const skip = (page - 1) * limit;
      const query = {};

      // Apply filters
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.payment_status) {
        query.payment_status = filters.payment_status;
      }
      if (filters.customer_id) {
        query.customer_id = filters.customer_id;
      }
      if (filters.store_id) {
        query.store_id = filters.store_id;
      }
      if (filters.date_from || filters.date_to) {
        query.invoice_date = {};
        if (filters.date_from) {
          query.invoice_date.$gte = new Date(filters.date_from);
        }
        if (filters.date_to) {
          query.invoice_date.$lte = new Date(filters.date_to);
        }
      }

      const [invoices, total] = await Promise.all([
        Invoice.find(query)
          .populate('customer_id', 'name phone email')
          .populate('store_id', 'name code')
          .populate('created_by', 'firstName lastName email')
          .sort({ invoice_date: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Invoice.countDocuments(query)
      ]);

      return {
        data: invoices,
        total,
        page,
        limit
      };
    } catch (error) {
      logger.error('Error in getInvoices service', { error: error.message });
      throw error;
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(invoiceId) {
    try {
      const invoice = await Invoice.findById(invoiceId)
        .populate('customer_id', 'name phone email address')
        .populate('store_id', 'name code address')
        .populate('created_by', 'firstName lastName email')
        .lean();

      if (!invoice) {
        const error = new Error('Invoice not found');
        error.statusCode = 404;
        throw error;
      }

      return invoice;
    } catch (error) {
      logger.error('Error in getInvoiceById service', { error: error.message });
      throw error;
    }
  }

  /**
   * Create new invoice
   */
  async createInvoice(invoiceData, createdBy) {
    try {
      const invoice = new Invoice({
        ...invoiceData,
        created_by: createdBy
      });

      await invoice.save();

      return invoice.toObject();
    } catch (error) {
      logger.error('Error in createInvoice service', { error: error.message });
      throw error;
    }
  }

  /**
   * Send invoice
   */
  async sendInvoice(invoiceId, sendTo, sentBy) {
    try {
      const invoice = await Invoice.findById(invoiceId);

      if (!invoice) {
        const error = new Error('Invoice not found');
        error.statusCode = 404;
        throw error;
      }

      if (invoice.status === 'CANCELLED') {
        const error = new Error('Cannot send cancelled invoice');
        error.statusCode = 400;
        throw error;
      }

      invoice.status = invoice.status === 'DRAFT' ? 'SENT' : invoice.status;
      invoice.sent_at = new Date();
      invoice.sent_to = sendTo || invoice.customer_email;

      await invoice.save();

      // TODO: Send email/SMS notification here
      logger.info(`Invoice sent: ${invoice.invoice_number} to ${invoice.sent_to}`);

      return invoice.toObject();
    } catch (error) {
      logger.error('Error in sendInvoice service', { error: error.message });
      throw error;
    }
  }
}

module.exports = new InvoiceService();

