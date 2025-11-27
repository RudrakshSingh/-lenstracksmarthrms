const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoice_number: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  invoice_date: {
    type: Date,
    required: true
  },
  due_date: {
    type: Date,
    required: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customer_name: {
    type: String,
    required: true
  },
  customer_email: {
    type: String
  },
  customer_address: {
    type: String
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  items: [{
    description: {
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
    tax_rate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    tax_amount: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true
    }
  }],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax_total: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED'],
    default: 'DRAFT',
    index: true
  },
  payment_status: {
    type: String,
    enum: ['UNPAID', 'PARTIAL', 'PAID'],
    default: 'UNPAID'
  },
  payment_method: {
    type: String,
    enum: ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'OTHER']
  },
  payment_date: {
    type: Date
  },
  payment_reference: {
    type: String
  },
  notes: {
    type: String,
    maxlength: 1000
  },
  terms: {
    type: String,
    maxlength: 500
  },
  sent_at: {
    type: Date
  },
  sent_to: {
    type: String
  },
  viewed_at: {
    type: Date
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Pre-save middleware
invoiceSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Generate invoice number if not provided
  if (!this.invoice_number) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    this.invoice_number = `INV-${year}${month}-${Date.now().toString().slice(-6)}`;
  }
  
  // Calculate totals
  this.subtotal = this.items.reduce((sum, item) => {
    item.tax_amount = (item.unit_price * item.quantity * item.tax_rate) / 100;
    item.total = (item.unit_price * item.quantity) + item.tax_amount;
    return sum + (item.unit_price * item.quantity);
  }, 0);
  
  this.tax_total = this.items.reduce((sum, item) => sum + item.tax_amount, 0);
  this.total_amount = this.subtotal + this.tax_total - this.discount;
  
  next();
});

// Indexes
invoiceSchema.index({ invoice_date: 1, store_id: 1 });
invoiceSchema.index({ customer_id: 1, invoice_date: 1 });
invoiceSchema.index({ status: 1, payment_status: 1 });
invoiceSchema.index({ due_date: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);

