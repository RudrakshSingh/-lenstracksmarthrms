const mongoose = require('mongoose');

const salesOrderSchema = new mongoose.Schema({
  // Order Information
  order_number: {
    type: String,
    required: true,
    unique: true
  },
  order_date: {
    type: Date,
    required: true
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  
  // Customer Information
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customer_name: {
    type: String,
    required: true
  },
  customer_phone: String,
  customer_email: String,
  
  // Order Items
  items: [{
    product_variant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductVariant',
      required: false  // Optional for manual entries
    },
    product_name: {
      type: String,
      required: true
    },
    sku: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unit_price: {
      type: Number,
      required: true,
      min: 0
    },
    discount_percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    discount_amount: {
      type: Number,
      default: 0,
      min: 0
    },
    tax_rate: {
      type: Number,
      default: 0
    },
    tax_amount: {
      type: Number,
      default: 0
    },
    line_total: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  
  // Pricing Summary
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  total_discount: {
    type: Number,
    default: 0,
    min: 0
  },
  total_tax: {
    type: Number,
    default: 0,
    min: 0
  },
  shipping_charges: {
    type: Number,
    default: 0,
    min: 0
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Payment Information
  payment_method: {
    type: String,
    enum: ['CASH', 'CARD', 'UPI', 'NET_BANKING', 'CHEQUE', 'EMI', 'OTHER'],
    required: true
  },
  payment_status: {
    type: String,
    enum: ['PENDING', 'PARTIAL', 'PAID', 'REFUNDED', 'CANCELLED'],
    default: 'PENDING'
  },
  payment_reference: String,
  payment_date: Date,
  
  // Order Status
  status: {
    type: String,
    enum: ['DRAFT', 'CONFIRMED', 'PROCESSING', 'READY', 'DELIVERED', 'CANCELLED', 'RETURNED'],
    default: 'DRAFT'
  },
  
  // Delivery Information
  delivery_type: {
    type: String,
    enum: ['PICKUP', 'HOME_DELIVERY', 'STORE_DELIVERY'],
    default: 'PICKUP'
  },
  delivery_address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    phone: String
  },
  expected_delivery_date: Date,
  actual_delivery_date: Date,
  
  // Prescription Information
  prescription_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription'
  },
  prescription_required: {
    type: Boolean,
    default: false
  },
  
  // Special Instructions
  special_instructions: String,
  notes: String,
  
  // Staff Information
  sales_person_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sales_person_name: {
    type: String,
    required: true
  },
  
  // Timestamps
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware
salesOrderSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Generate order number if not provided
  if (!this.order_number) {
    this.order_number = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }
  
  // Calculate line totals for each item
  this.items.forEach(item => {
    const discountAmount = (item.unit_price * item.quantity * item.discount_percentage) / 100;
    const taxableAmount = (item.unit_price * item.quantity) - discountAmount;
    const taxAmount = (taxableAmount * item.tax_rate) / 100;
    
    item.discount_amount = discountAmount;
    item.tax_amount = taxAmount;
    item.line_total = taxableAmount + taxAmount;
  });
  
  // Calculate order totals
  this.subtotal = this.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  this.total_discount = this.items.reduce((sum, item) => sum + item.discount_amount, 0);
  this.total_tax = this.items.reduce((sum, item) => sum + item.tax_amount, 0);
  this.total_amount = this.subtotal - this.total_discount + this.total_tax + this.shipping_charges;
  
  next();
});

// Indexes (order_number already has unique index from schema definition)
salesOrderSchema.index({ order_date: 1, store_id: 1 });
salesOrderSchema.index({ customer_id: 1, order_date: 1 });
salesOrderSchema.index({ status: 1, order_date: 1 });
salesOrderSchema.index({ sales_person_id: 1, order_date: 1 });
salesOrderSchema.index({ payment_status: 1 });

const SalesOrder = mongoose.model('SalesOrder', salesOrderSchema);

module.exports = SalesOrder;
