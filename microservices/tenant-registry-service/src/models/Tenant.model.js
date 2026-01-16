const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  tenantId: { 
    type: String, 
    unique: true, 
    required: true, 
    index: true,
    trim: true,
    lowercase: true
  },
  tenantName: { 
    type: String, 
    required: true, 
    trim: true 
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    index: true
  },
  phone: {
    type: String,
    trim: true
  },
  domain: { 
    type: String, 
    unique: true, 
    required: true,
    trim: true,
    lowercase: true
  },
  subdomain: { 
    type: String, 
    unique: true, 
    required: true,
    trim: true,
    lowercase: true
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
    pincode: { type: String, trim: true }
  },
  contact: {
    primaryContact: { type: String, trim: true },
    primaryEmail: { type: String, lowercase: true, trim: true },
    primaryPhone: { type: String, trim: true },
    billingContact: { type: String, trim: true },
    billingEmail: { type: String, lowercase: true, trim: true },
    technicalContact: { type: String, trim: true },
    technicalEmail: { type: String, lowercase: true, trim: true }
  },
  modules: [{
    type: String,
    enum: ['hr', 'crm', 'inventory', 'financial', 'sales', 'purchase', 'analytics', 'reports']
  }],
  planDetails: {
    name: { type: String },
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    billing: { type: String, enum: ['Monthly', 'Quarterly', 'Yearly'], default: 'Monthly' },
    features: [{ type: String }]
  },
  subscription: {
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    renewalDate: { type: Date },
    autoRenewal: { type: Boolean, default: true },
    paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed', 'Free'], default: 'Pending' }
  },
  adminUser: {
    userId: { type: String },
    email: { type: String, lowercase: true, trim: true },
    name: { type: String, trim: true },
    role: { type: String, default: 'admin' }
  },
  // Tenant-level Super Admin (Azure-like)
  superAdminUser: {
    userId: { type: String },
    email: { type: String, lowercase: true, trim: true },
    name: { type: String, trim: true },
    role: { type: String, default: 'superadmin' }
  },
  database: { 
    type: String, 
    required: true,
    trim: true
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'suspended', 'trial'], 
    default: 'trial' 
  },
  plan: {
    type: String,
    enum: ['basic', 'professional', 'enterprise', 'custom'],
    default: 'basic'
  },
  features: [{
    name: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    limits: {
      maxUsers: { type: Number, default: 10 },
      maxStorage: { type: Number, default: 1000 }, // MB
      maxApiCalls: { type: Number, default: 10000 }
    }
  }],
  branding: {
    logo: { type: String },
    primaryColor: { type: String, default: '#007bff' },
    secondaryColor: { type: String, default: '#6c757d' },
    favicon: { type: String },
    customCss: { type: String }
  },
  configuration: {
    timezone: { type: String, default: 'UTC' },
    currency: { type: String, default: 'USD' },
    language: { type: String, default: 'en' },
    dateFormat: { type: String, default: 'MM/DD/YYYY' },
    timeFormat: { type: String, default: '12h' }
  },
  billing: {
    customerId: { type: String },
    subscriptionId: { type: String },
    planId: { type: String },
    status: { type: String, default: 'active' },
    nextBillingDate: { type: Date },
    amount: { type: Number, default: 0 }
  },
  limits: {
    maxUsers: { type: Number, default: 10 },
    maxStorage: { type: Number, default: 1000 },
    maxApiCalls: { type: Number, default: 10000 },
    maxIntegrations: { type: Number, default: 5 }
  },
  usage: {
    currentUsers: { type: Number, default: 0 },
    currentStorage: { type: Number, default: 0 },
    currentApiCalls: { type: Number, default: 0 },
    currentIntegrations: { type: Number, default: 0 }
  },
  settings: {
    allowSelfRegistration: { type: Boolean, default: true },
    requireEmailVerification: { type: Boolean, default: true },
    allowPasswordReset: { type: Boolean, default: true },
    sessionTimeout: { type: Number, default: 30 }, // minutes
    maxLoginAttempts: { type: Number, default: 5 }
  },
  integrations: [{
    name: { type: String, required: true },
    type: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive', 'error'], default: 'inactive' },
    config: { type: mongoose.Schema.Types.Mixed },
    lastSync: { type: Date }
  }],
  analytics: {
    totalLogins: { type: Number, default: 0 },
    lastLogin: { type: Date },
    totalApiCalls: { type: Number, default: 0 },
    totalStorageUsed: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  collection: 'tenants'
});

// Indexes for performance
tenantSchema.index({ tenantId: 1 });
tenantSchema.index({ domain: 1 });
tenantSchema.index({ subdomain: 1 });
tenantSchema.index({ status: 1 });
tenantSchema.index({ plan: 1 });

// Virtual for tenant URL
tenantSchema.virtual('tenantUrl').get(function() {
  return `https://${this.subdomain}.etelios.com`;
});

// Method to check if tenant is active
tenantSchema.methods.isActive = function() {
  return this.status === 'active';
};

// Method to check if tenant has feature
tenantSchema.methods.hasFeature = function(featureName) {
  const feature = this.features.find(f => f.name === featureName);
  return feature && feature.enabled;
};

// Method to check if tenant is within limits
tenantSchema.methods.isWithinLimits = function() {
  return this.usage.currentUsers <= this.limits.maxUsers &&
         this.usage.currentStorage <= this.limits.maxStorage &&
         this.usage.currentApiCalls <= this.limits.maxApiCalls;
};

// Static method to find tenant by domain
tenantSchema.statics.findByDomain = function(domain) {
  return this.findOne({ 
    $or: [
      { domain: domain },
      { subdomain: domain }
    ]
  });
};

// Static method to find active tenants
tenantSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

module.exports = mongoose.model('Tenant', tenantSchema);
