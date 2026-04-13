const mongoose = require('mongoose');

const posPaymentSchema = new mongoose.Schema({
  invoice_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'POSInvoice',
    required: true,
    index: true
  },
  payment_method: {
    type: String,
    enum: ['CASH', 'CARD', 'UPI', 'NET_BANKING', 'CHEQUE', 'WALLET', 'OTHER'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  transaction_id: {
    type: String,
    trim: true
  },
  payment_status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
    default: 'PENDING'
  },
  payment_date: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
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

posPaymentSchema.index({ invoice_id: 1 });
posPaymentSchema.index({ tenantId: 1 });

module.exports = mongoose.model('POSPayment', posPaymentSchema);
