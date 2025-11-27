const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema({
  opportunity_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  lead_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },
  stage: {
    type: String,
    enum: ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'],
    default: 'PROSPECTING',
    index: true
  },
  probability: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  expected_close_date: {
    type: Date
  },
  actual_close_date: {
    type: Date
  },
  close_reason: {
    type: String,
    enum: ['WON', 'LOST', 'CANCELLED', 'ON_HOLD'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  source: {
    type: String,
    enum: ['WEBSITE', 'REFERRAL', 'WALK_IN', 'CALL', 'EMAIL', 'SOCIAL_MEDIA', 'OTHER'],
    default: 'OTHER'
  },
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },
  products: [{
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    quantity: {
      type: Number,
      min: 1
    },
    unit_price: {
      type: Number,
      min: 0
    },
    total: {
      type: Number,
      min: 0
    }
  }],
  notes: [{
    note: {
      type: String,
      required: true
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    created_at: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED', 'ON_HOLD'],
    default: 'OPEN',
    index: true
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

// Indexes
opportunitySchema.index({ customer_id: 1 });
opportunitySchema.index({ lead_id: 1 });
opportunitySchema.index({ stage: 1, status: 1 });
opportunitySchema.index({ assigned_to: 1 });
opportunitySchema.index({ store_id: 1 });
opportunitySchema.index({ expected_close_date: 1 });

// Pre-save middleware to update opportunity_id
opportunitySchema.pre('save', async function(next) {
  if (!this.opportunity_id) {
    const count = await mongoose.model('Opportunity').countDocuments();
    this.opportunity_id = `OPP${String(count + 1).padStart(6, '0')}`;
  }
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('Opportunity', opportunitySchema);

