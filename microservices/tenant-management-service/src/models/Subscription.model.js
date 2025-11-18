const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const subscriptionSchema = new mongoose.Schema({
  subscriptionId: {
    type: String,
    required: true,
    unique: true,
    default: () => `sub_${uuidv4().split('-')[0]}`
  },
  tenantId: {
    type: String,
    required: true,
    ref: 'Tenant',
    index: true
  },
  plan: {
    type: String,
    enum: ['basic', 'professional', 'enterprise', 'custom'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'past_due', 'trialing', 'expired'],
    default: 'active'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  cycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  nextBilling: {
    type: Date,
    required: true
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancellationReason: {
    type: String,
    default: null
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'bank_transfer', 'paypal', 'other'],
    default: 'credit_card'
  },
  features: [{
    type: String
  }],
  limits: {
    users: Number,
    storage: String,
    apiCalls: Number,
    bandwidth: String
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

subscriptionSchema.index({ tenantId: 1, status: 1 });
subscriptionSchema.index({ nextBilling: 1 });
subscriptionSchema.index({ status: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;

