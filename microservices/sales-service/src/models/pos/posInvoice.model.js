const mongoose = require('mongoose');

const posInvoiceSchema = new mongoose.Schema({
  invoice_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: false
  },
  invoice_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  items: [{
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    sku: String,
    name: String,
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unit_price: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  }],
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
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  payment_status: {
    type: String,
    enum: ['PENDING', 'PARTIAL', 'PAID', 'REFUNDED'],
    default: 'PENDING'
  },
  status: {
    type: String,
    enum: ['DRAFT', 'CONFIRMED', 'CANCELLED', 'VOIDED'],
    default: 'DRAFT'
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tenantId: {
    type: String,
    required: true,
    default: 'default',
    index: true
  }
}, {
  timestamps: true
});

posInvoiceSchema.index({ store_id: 1, invoice_date: -1 });
posInvoiceSchema.index({ tenantId: 1, invoice_number: 1 }, { unique: true });

module.exports = mongoose.model('POSInvoice', posInvoiceSchema);
