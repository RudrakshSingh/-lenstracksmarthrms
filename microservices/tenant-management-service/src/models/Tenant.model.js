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
    enum: ['basic', 'professional', 'enterprise', 'custom'],
    default: 'basic'
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

// Pre-save middleware
tenantSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Methods
tenantSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Tenant = mongoose.model('Tenant', tenantSchema);

module.exports = Tenant;

