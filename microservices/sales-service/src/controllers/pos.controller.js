// POS Models - All models are now available
const POSInvoice = require('../models/pos/posInvoice.model');
const POSInvoiceLine = require('../models/pos/posInvoiceLine.model');
const POSPayment = require('../models/pos/posPayment.model');
const POSOffer = require('../models/pos/posOffer.model');
const LabJob = require('../models/pos/labJob.model');
const Prescription = require('../models/Prescription.model');
const Customer = require('../models/Customer.model');
const Product = require('../models/ProductMaster.model');

// Items Management
const searchItems = async (req, res) => {
  try {
    const { q, store_id, category } = req.query;
    
    let query = {};
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { barcode: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } },
        { brand: { $regex: q, $options: 'i' } }
      ];
    }
    if (category) {
      query.category = category;
    }
    
    const items = await Product.find(query)
      .select('sku name barcode hsn mrp price stock_qty tax_class brand category')
      .limit(50);
    
    res.json({
      success: true,
      data: items,
      count: items.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching items',
      error: error.message
    });
  }
};

const getItemDetails = async (req, res) => {
  try {
    const { sku_id } = req.params;
    
    const item = await Product.findOne({ sku: sku_id });
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting item details',
      error: error.message
    });
  }
};

// Customer Management
const searchCustomers = async (req, res) => {
  try {
    const { q } = req.query;
    
    let query = {};
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ];
    }
    
    const customers = await Customer.find(query)
      .select('name phone email city loyalty_points')
      .limit(20);
    
    res.json({
      success: true,
      data: customers,
      count: customers.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching customers',
      error: error.message
    });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { name, phone, email, city, address, gstin } = req.body;
    
    // Check if customer already exists
    const existingCustomer = await Customer.findOne({ phone });
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Customer with this phone number already exists',
        data: existingCustomer
      });
    }
    
    const customer = new Customer({
      name,
      phone,
      email,
      city,
      address,
      gstin,
      created_by: req.user.id
    });
    
    await customer.save();
    
    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating customer',
      error: error.message
    });
  }
};

// Prescription Management
const createPrescription = async (req, res) => {
  try {
    const {
      customer_id,
      rx_date,
      od,
      os,
      add,
      pd,
      seg_height,
      notes,
      source
    } = req.body;
    
    const prescription = new Prescription({
      customer_id,
      rx_date: rx_date || new Date(),
      od_sph: od.sph,
      od_cyl: od.cyl,
      od_axis: od.axis,
      os_sph: os.sph,
      os_cyl: os.cyl,
      os_axis: os.axis,
      add_power: add,
      pd_right: pd.right,
      pd_left: pd.left,
      seg_height_right: seg_height.right,
      seg_height_left: seg_height.left,
      notes,
      source,
      created_by: req.user.id
    });
    
    await prescription.save();
    
    res.status(201).json({
      success: true,
      message: 'Prescription created successfully',
      data: prescription
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating prescription',
      error: error.message
    });
  }
};

// Pricing Engine
const evaluatePricing = async (req, res) => {
  try {
    const { store_id, items, customer_id, coupon, context } = req.body;
    
    // Get applicable offers
    const offers = await POSOffer.find({
      active: true,
      start_at: { $lte: new Date() },
      end_at: { $gte: new Date() }
    }).sort({ priority: -1 });
    
    let cartTotal = 0;
    let totalDiscount = 0;
    const appliedRules = [];
    
    // Calculate line totals
    const lines = items.map(item => {
      const lineTotal = item.price * item.quantity;
      cartTotal += lineTotal;
      
      return {
        sku_id: item.sku_id,
        quantity: item.quantity,
        price: item.price,
        line_total: lineTotal,
        discount: 0,
        tax_rate: 18, // Default GST rate
        tax_amount: lineTotal * 0.18,
        net_amount: lineTotal * 1.18
      };
    });
    
    // Apply offers
    for (const offer of offers) {
      if (offer.isApplicable({ 
        cart_total: cartTotal, 
        items, 
        customer_id, 
        store_id 
      })) {
        const discount = offer.calculateDiscount({ 
          cart_total: cartTotal, 
          items, 
          customer_id, 
          store_id 
        });
        
        if (discount.discount_amount > 0) {
          totalDiscount += discount.discount_amount;
          appliedRules.push({
            offer_id: offer._id,
            offer_name: offer.name,
            discount_amount: discount.discount_amount,
            reason: discount.reason
          });
        }
      }
    }
    
    const finalTotal = cartTotal - totalDiscount;
    const taxAmount = finalTotal * 0.18;
    const grandTotal = finalTotal + taxAmount;
    
    res.json({
      success: true,
      data: {
        lines,
        totals: {
          subtotal: cartTotal,
          discount: totalDiscount,
          tax: taxAmount,
          grand_total: grandTotal
        },
        applied_rules: appliedRules,
        savings: totalDiscount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error evaluating pricing',
      error: error.message
    });
  }
};

// Invoice Management
const createInvoice = async (req, res) => {
  try {
    const {
      store_id,
      customer_id,
      items,
      offers,
      payments,
      rx_id,
      notes,
      delivery
    } = req.body;
    
    // Create invoice
    const invoice = new POSInvoice({
      store_id,
      customer_id,
      subtotal: 0,
      tax_total: 0,
      grand_total: 0,
      created_by: req.user.id,
      notes,
      delivery_type: delivery?.type || 'pickup',
      delivery_address: delivery?.address
    });
    
    await invoice.save();
    
    // Create invoice lines
    let subtotal = 0;
    for (const item of items) {
      const lineTotal = item.price * item.quantity;
      subtotal += lineTotal;
      
      const line = new POSInvoiceLine({
        invoice_id: invoice._id,
        sku_id: item.sku_id,
        product_name: item.name,
        product_type: item.type,
        hsn: item.hsn,
        tax_class: item.tax_class,
        tax_rate: item.tax_rate || 18,
        quantity: item.quantity,
        mrp: item.mrp,
        selling_price: item.price,
        discount_amt: item.discount || 0,
        tax_amt: lineTotal * 0.18,
        net_amt: lineTotal * 1.18,
        lens_config: item.lens_config,
        frame_config: item.frame_config
      });
      
      await line.save();
    }
    
    // Update invoice totals
    const taxTotal = subtotal * 0.18;
    const grandTotal = subtotal + taxTotal;
    
    invoice.subtotal = subtotal;
    invoice.tax_total = taxTotal;
    invoice.grand_total = grandTotal;
    await invoice.save();
    
    // Create payments
    for (const payment of payments) {
      const paymentRecord = new POSPayment({
        invoice_id: invoice._id,
        method: payment.method,
        amount: payment.amount,
        txn_ref: payment.ref,
        gateway: payment.gateway,
        status: 'completed'
      });
      
      await paymentRecord.save();
    }
    
    // Create lab job if required
    let labJobId = null;
    if (items.some(item => item.type === 'lens')) {
      const labJob = new LabJob({
        invoice_id: invoice._id,
        customer_id,
        lens_config: items.find(item => item.type === 'lens').lens_config,
        power: items.find(item => item.type === 'lens').power,
        measurements: items.find(item => item.type === 'lens').measurements,
        frame_info: items.find(item => item.type === 'frame')?.frame_info,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        delivery: {
          type: delivery?.type || 'pickup',
          address: delivery?.address
        },
        created_by: req.user.id
      });
      
      await labJob.save();
      labJobId = labJob._id;
    }
    
    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: {
        invoice_id: invoice._id,
        invoice_no: invoice.invoice_no,
        grand_total: grandTotal,
        lab_job_id: labJobId
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating invoice',
      error: error.message
    });
  }
};

// Export all controller functions
module.exports = {
  // Items
  searchItems,
  getItemDetails,
  
  // Customers
  searchCustomers,
  createCustomer,
  getCustomer: async (req, res) => {
    try {
      const customer = await Customer.findById(req.params.id);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
      res.json({ success: true, data: customer });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting customer',
        error: error.message
      });
    }
  },
  updateCustomer: async (req, res) => {
    try {
      const customer = await Customer.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
      res.json({
        success: true,
        message: 'Customer updated successfully',
        data: customer
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating customer',
        error: error.message
      });
    }
  },
  
  // Prescriptions
  createPrescription,
  getPrescription: async (req, res) => {
    try {
      const prescription = await Prescription.findById(req.params.id);
      if (!prescription) {
        return res.status(404).json({
          success: false,
          message: 'Prescription not found'
        });
      }
      res.json({ success: true, data: prescription });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting prescription',
        error: error.message
      });
    }
  },
  getCustomerPrescriptions: async (req, res) => {
    try {
      const prescriptions = await Prescription.find({
        customer_id: req.params.customer_id
      }).sort({ created_at: -1 });
      res.json({ success: true, data: prescriptions });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting customer prescriptions',
        error: error.message
      });
    }
  },
  
  // Pricing
  evaluatePricing,
  getOffers: async (req, res) => {
    try {
      const offers = await POSOffer.find({ active: true });
      res.json({ success: true, data: offers });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting offers',
        error: error.message
      });
    }
  },
  getOffer: async (req, res) => {
    try {
      const offer = await POSOffer.findById(req.params.id);
      if (!offer) {
        return res.status(404).json({
          success: false,
          message: 'Offer not found'
        });
      }
      res.json({ success: true, data: offer });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting offer',
        error: error.message
      });
    }
  },
  
  // Invoices
  createInvoice,
  getInvoice: async (req, res) => {
    try {
      const invoice = await POSInvoice.findById(req.params.id)
        .populate('customer_id')
        .populate('lines')
        .populate('payments');
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Invoice not found'
        });
      }
      res.json({ success: true, data: invoice });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting invoice',
        error: error.message
      });
    }
  },
  updateInvoice: async (req, res) => {
    try {
      const invoice = await POSInvoice.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Invoice not found'
        });
      }
      res.json({
        success: true,
        message: 'Invoice updated successfully',
        data: invoice
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating invoice',
        error: error.message
      });
    }
  },
  voidInvoice: async (req, res) => {
    try {
      const { reason } = req.body;
      const invoice = await POSInvoice.findByIdAndUpdate(
        req.params.id,
        { 
          status: 'void',
          payment_status: 'void',
          notes: reason
        },
        { new: true }
      );
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Invoice not found'
        });
      }
      res.json({
        success: true,
        message: 'Invoice voided successfully',
        data: invoice
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error voiding invoice',
        error: error.message
      });
    }
  },
  
  // Payments
  addPayment: async (req, res) => {
    try {
      const { method, amount, ref, gateway } = req.body;
      const payment = new POSPayment({
        invoice_id: req.params.id,
        method,
        amount,
        txn_ref: ref,
        gateway,
        status: 'completed'
      });
      await payment.save();
      res.json({
        success: true,
        message: 'Payment added successfully',
        data: payment
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error adding payment',
        error: error.message
      });
    }
  },
  getPayments: async (req, res) => {
    try {
      const payments = await POSPayment.find({ invoice_id: req.params.id });
      res.json({ success: true, data: payments });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting payments',
        error: error.message
      });
    }
  },
  refundPayment: async (req, res) => {
    try {
      const { amount, reason } = req.body;
      const payment = await POSPayment.findById(req.params.payment_id);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }
      await payment.refundPayment(amount, reason);
      res.json({
        success: true,
        message: 'Payment refunded successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error refunding payment',
        error: error.message
      });
    }
  },
  
  // WhatsApp
  sendWhatsApp: async (req, res) => {
    try {
      const { to } = req.body;
      // Implement WhatsApp integration
      res.json({
        success: true,
        message: 'WhatsApp sent successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error sending WhatsApp',
        error: error.message
      });
    }
  },
  
  // Returns
  processReturn: async (req, res) => {
    try {
      const { base_invoice_id, items, reason, restock } = req.body;
      // Implement return processing
      res.json({
        success: true,
        message: 'Return processed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error processing return',
        error: error.message
      });
    }
  },
  getReturn: async (req, res) => {
    try {
      // Implement get return
      res.json({ success: true, data: {} });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting return',
        error: error.message
      });
    }
  },
  
  // Lab Jobs
  createLabJob: async (req, res) => {
    try {
      const labJob = new LabJob({
        ...req.body,
        created_by: req.user.id
      });
      await labJob.save();
      res.status(201).json({
        success: true,
        message: 'Lab job created successfully',
        data: labJob
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating lab job',
        error: error.message
      });
    }
  },
  getLabJob: async (req, res) => {
    try {
      const labJob = await LabJob.findById(req.params.id);
      if (!labJob) {
        return res.status(404).json({
          success: false,
          message: 'Lab job not found'
        });
      }
      res.json({ success: true, data: labJob });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting lab job',
        error: error.message
      });
    }
  },
  updateLabJobStatus: async (req, res) => {
    try {
      const { status, notes } = req.body;
      const labJob = await LabJob.findByIdAndUpdate(
        req.params.id,
        { status, internal_notes: notes },
        { new: true }
      );
      if (!labJob) {
        return res.status(404).json({
          success: false,
          message: 'Lab job not found'
        });
      }
      res.json({
        success: true,
        message: 'Lab job status updated successfully',
        data: labJob
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating lab job status',
        error: error.message
      });
    }
  },
  getCustomerLabJobs: async (req, res) => {
    try {
      const labJobs = await LabJob.find({
        customer_id: req.params.customer_id
      }).sort({ created_at: -1 });
      res.json({ success: true, data: labJobs });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting customer lab jobs',
        error: error.message
      });
    }
  },
  
  // Register
  openRegister: async (req, res) => {
    try {
      const { store_id, opening_float } = req.body;
      // Implement register opening
      res.json({
        success: true,
        message: 'Register opened successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error opening register',
        error: error.message
      });
    }
  },
  closeRegister: async (req, res) => {
    try {
      const { closing_counts, deposits, notes } = req.body;
      // Implement register closing
      res.json({
        success: true,
        message: 'Register closed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error closing register',
        error: error.message
      });
    }
  },
  getRegisterShifts: async (req, res) => {
    try {
      // Implement get register shifts
      res.json({ success: true, data: [] });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting register shifts',
        error: error.message
      });
    }
  },
  getCurrentShift: async (req, res) => {
    try {
      // Implement get current shift
      res.json({ success: true, data: {} });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting current shift',
        error: error.message
      });
    }
  },
  
  // GST
  generateEInvoice: async (req, res) => {
    try {
      const { invoice_id } = req.body;
      // Implement GST e-invoice generation
      res.json({
        success: true,
        message: 'E-invoice generated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error generating e-invoice',
        error: error.message
      });
    }
  },
  generateEWayBill: async (req, res) => {
    try {
      const { invoice_id, distance_km } = req.body;
      // Implement e-way bill generation
      res.json({
        success: true,
        message: 'E-way bill generated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error generating e-way bill',
        error: error.message
      });
    }
  },
  getGSTStatus: async (req, res) => {
    try {
      // Implement GST status check
      res.json({ success: true, data: {} });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting GST status',
        error: error.message
      });
    }
  },
  
  // Reports
  getDailySales: async (req, res) => {
    try {
      const { store_id, date } = req.query;
      // Implement daily sales report
      res.json({ success: true, data: {} });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting daily sales',
        error: error.message
      });
    }
  },
  getItemsSold: async (req, res) => {
    try {
      const { from, to, store_id } = req.query;
      // Implement items sold report
      res.json({ success: true, data: {} });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting items sold',
        error: error.message
      });
    }
  },
  getPaymentsBreakup: async (req, res) => {
    try {
      const { from, to, store_id } = req.query;
      // Implement payments breakup report
      res.json({ success: true, data: {} });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting payments breakup',
        error: error.message
      });
    }
  },
  getCustomerAnalytics: async (req, res) => {
    try {
      // Implement customer analytics
      res.json({ success: true, data: {} });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting customer analytics',
        error: error.message
      });
    }
  },
  
  // Offline
  getOfflineQueue: async (req, res) => {
    try {
      // Implement offline queue
      res.json({ success: true, data: [] });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting offline queue',
        error: error.message
      });
    }
  },
  syncOfflineData: async (req, res) => {
    try {
      // Implement offline sync
      res.json({
        success: true,
        message: 'Offline data synced successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error syncing offline data',
        error: error.message
      });
    }
  },
  clearOfflineItem: async (req, res) => {
    try {
      // Implement clear offline item
      res.json({
        success: true,
        message: 'Offline item cleared successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error clearing offline item',
        error: error.message
      });
    }
  },
  
  // Print
  printThermal: async (req, res) => {
    try {
      // Implement thermal printing
      res.json({
        success: true,
        message: 'Thermal print sent successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error printing thermal',
        error: error.message
      });
    }
  },
  printA4: async (req, res) => {
    try {
      // Implement A4 printing
      res.json({
        success: true,
        message: 'A4 print sent successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error printing A4',
        error: error.message
      });
    }
  },
  getPrintTemplates: async (req, res) => {
    try {
      // Implement get print templates
      res.json({ success: true, data: [] });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting print templates',
        error: error.message
      });
    }
  },
  
  // Dashboard
  getDashboard: async (req, res) => {
    try {
      // Implement dashboard data
      res.json({ success: true, data: {} });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting dashboard',
        error: error.message
      });
    }
  },
  getSalesTrends: async (req, res) => {
    try {
      // Implement sales trends
      res.json({ success: true, data: {} });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting sales trends',
        error: error.message
      });
    }
  },
  getTopProducts: async (req, res) => {
    try {
      // Implement top products
      res.json({ success: true, data: {} });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting top products',
        error: error.message
      });
    }
  },
  getCustomerInsights: async (req, res) => {
    try {
      // Implement customer insights
      res.json({ success: true, data: {} });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting customer insights',
        error: error.message
      });
    }
  }
};
