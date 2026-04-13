const mongoose = require('mongoose');

const posInvoiceLineSchema = new mongoose.Schema({
  invoice_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'POSInvoice',
    required: true,
    index: true
  },
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  sku: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
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
  tax_rate: {
    type: Number,
    default: 0
  },
  tax_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  line_total: {
    type: Number,
    required: true,
    min: 0
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

posInvoiceLineSchema.index({ invoice_id: 1 });
posInvoiceLineSchema.index({ tenantId: 1 });

module.exports = mongoose.model('POSInvoiceLine', posInvoiceLineSchema);
