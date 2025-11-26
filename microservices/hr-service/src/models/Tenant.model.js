const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  domain: {
    type: String,
    trim: true,
    lowercase: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
    pincode: { type: String, trim: true }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['Free', 'Basic', 'Professional', 'Enterprise'],
      default: 'Basic'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['Active', 'Suspended', 'Cancelled', 'Expired'],
      default: 'Active'
    }
  },
  settings: {
    maxUsers: {
      type: Number,
      default: 10
    },
    maxStorage: {
      type: Number,
      default: 1000 // in GB
    },
    features: [{
      type: String,
      enum: ['HRMS', 'CRM', 'Inventory', 'Financial', 'Sales', 'Admin']
    }]
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended'],
    default: 'Active',
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
tenantSchema.index({ tenantId: 1 });
tenantSchema.index({ email: 1 });
tenantSchema.index({ status: 1 });
tenantSchema.index({ 'subscription.plan': 1 });
tenantSchema.index({ createdAt: -1 });

const Tenant = mongoose.model('Tenant', tenantSchema);

module.exports = Tenant;

