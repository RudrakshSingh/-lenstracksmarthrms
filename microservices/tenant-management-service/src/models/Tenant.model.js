const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const tenantSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    unique: true,
    default: () => `tenant_${uuidv4().split('-')[0]}`
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  domain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Domain can only contain lowercase letters, numbers, and hyphens']
  },
  customDomain: {
    type: String,
    trim: true,
    lowercase: true,
    default: null
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'inactive', 'pending', 'deleted'],
    default: 'pending'
  },
  plan: {
    type: String,
    // CORE = single-store retail | GROWTH = small chain (2-10 stores) | ENTERPRISE = multi-city chain
    // Legacy values mapped on read: basic→CORE, professional→GROWTH, enterprise→ENTERPRISE, custom→ENTERPRISE
    enum: ['CORE', 'GROWTH', 'ENTERPRISE', 'basic', 'professional', 'enterprise', 'custom'],
    default: 'CORE'
  },
  // Granular feature flags — derived from plan on create/update, can be overridden per tenant.
  // CORE unlocks: opticalOrders, billing. GROWTH adds: rxVendorOrders, labEngine, barcode,
  // storeDamage, complaintEngine. ENTERPRISE adds all remaining flags.
  featureFlags: {
    // CORE+
    opticalOrders:      { type: Boolean, default: true },
    billing:            { type: Boolean, default: true },
    hrms:               { type: Boolean, default: true },
    attendance:         { type: Boolean, default: true },
    payroll:            { type: Boolean, default: true },
    basicReports:       { type: Boolean, default: true },
    basicCRM:           { type: Boolean, default: true },
    jtsBasic:           { type: Boolean, default: true },

    // GROWTH+
    rxVendorOrders:     { type: Boolean, default: false },
    labEngine:          { type: Boolean, default: false },
    barcode:            { type: Boolean, default: false },
    storeDamage:        { type: Boolean, default: false },
    complaintEngine:    { type: Boolean, default: false },
    vendorScorecard:    { type: Boolean, default: false },

    // ENTERPRISE only
    auditSystem:        { type: Boolean, default: false },
    deadStockProtection:{ type: Boolean, default: false },
    gstEngine:          { type: Boolean, default: false },
    multiGSTIN:         { type: Boolean, default: false },
    financeReports:     { type: Boolean, default: false },
    analyticsHub:       { type: Boolean, default: false },
    jtsFullAccess:      { type: Boolean, default: false },
    depositVerification:{ type: Boolean, default: false },
    customerDue:        { type: Boolean, default: false },
    superAdminSupport:  { type: Boolean, default: false }
  },
  features: [{
    type: String,
    enum: ['hrms', 'crm', 'inventory', 'financial', 'sales', 'purchase', 'analytics', 'reports']
  }],
  limits: {
    users: {
      type: Number,
      default: 10
    },
    storage: {
      type: String,
      default: '5GB'
    },
    apiCalls: {
      type: Number,
      default: 10000
    },
    bandwidth: {
      type: String,
      default: '10GB'
    }
  },
  usage: {
    users: {
      type: Number,
      default: 0
    },
    storage: {
      type: String,
      default: '0GB'
    },
    apiCalls: {
      type: Number,
      default: 0
    },
    bandwidth: {
      type: String,
      default: '0GB'
    }
  },
  billing: {
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    cycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      default: 'monthly'
    },
    nextBilling: {
      type: Date,
      default: null
    },
    subscriptionId: {
      type: String,
      default: null
    }
  },
  adminUser: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    email: {
      type: String,
      default: null
    }
  },
  settings: {
    timezone: {
      type: String,
      default: 'UTC'
    },
    locale: {
      type: String,
      default: 'en-US'
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  lastLogin: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  deletedAt: {
    type: Date,
    default: null
  },
  dataRetentionUntil: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
tenantSchema.index({ tenantId: 1 });
tenantSchema.index({ domain: 1 });
tenantSchema.index({ status: 1 });
tenantSchema.index({ plan: 1 });
tenantSchema.index({ 'adminUser.userId': 1 });
tenantSchema.index({ createdAt: -1 });

// Virtual for full domain
tenantSchema.virtual('fullDomain').get(function() {
  const baseDomain = process.env.BASE_DOMAIN || 'yourdomain.com';
  return this.customDomain || `${this.domain}.${baseDomain}`;
});

// Derive feature flags from plan whenever plan changes.
// Rule: plan entitlements are the MINIMUM — flags at or below the plan level are always forced true.
// Flags above the plan level keep their current value (allow manual upsell overrides).
function applyPlanDefaults(doc) {
  const plan = String(doc.plan || 'CORE').toUpperCase();
  const normalised = plan === 'BASIC' ? 'CORE'
    : plan === 'PROFESSIONAL' ? 'GROWTH'
    : (plan === 'ENTERPRISE' || plan === 'CUSTOM') ? 'ENTERPRISE'
    : plan; // CORE | GROWTH | ENTERPRISE

  const flags = doc.featureFlags || {};

  // CORE baseline — always forced true for every plan
  const coreOn = ['opticalOrders', 'billing', 'hrms', 'attendance', 'payroll', 'basicReports', 'basicCRM', 'jtsBasic'];
  coreOn.forEach(f => { flags[f] = true; });

  // GROWTH additions — forced true for GROWTH and ENTERPRISE
  const growthOn = ['rxVendorOrders', 'labEngine', 'barcode', 'storeDamage', 'complaintEngine', 'vendorScorecard'];
  if (normalised === 'GROWTH' || normalised === 'ENTERPRISE') {
    growthOn.forEach(f => { flags[f] = true; });
  }

  // ENTERPRISE additions — forced true only for ENTERPRISE
  const enterpriseOn = ['auditSystem', 'deadStockProtection', 'gstEngine', 'multiGSTIN',
    'financeReports', 'analyticsHub', 'jtsFullAccess', 'depositVerification', 'customerDue', 'superAdminSupport'];
  if (normalised === 'ENTERPRISE') {
    enterpriseOn.forEach(f => { flags[f] = true; });
  }

  doc.featureFlags = flags;
}

// Pre-save middleware
tenantSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  applyPlanDefaults(this);
  next();
});

// Normalised plan string (legacy values → canonical)
tenantSchema.virtual('resolvedPlan').get(function () {
  const p = String(this.plan || 'CORE').toUpperCase();
  if (p === 'BASIC') return 'CORE';
  if (p === 'PROFESSIONAL') return 'GROWTH';
  if (p === 'ENTERPRISE' || p === 'CUSTOM') return 'ENTERPRISE';
  return p; // CORE | GROWTH | ENTERPRISE
});

tenantSchema.statics.applyPlanDefaults = applyPlanDefaults;

// Methods
tenantSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Tenant = mongoose.model('Tenant', tenantSchema);

module.exports = Tenant;

