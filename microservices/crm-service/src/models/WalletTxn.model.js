const mongoose = require('mongoose');

const walletTxnSchema = new mongoose.Schema({
  txn_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  reference: {
    type: String,
    trim: true
  },
  balance_after: {
    type: Number,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes
walletTxnSchema.index({ customer_id: 1, created_at: -1 });
walletTxnSchema.index({ txn_id: 1 });

module.exports = mongoose.model('WalletTxn', walletTxnSchema);

