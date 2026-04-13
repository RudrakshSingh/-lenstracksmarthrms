const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  // Tenant isolation
  tenantId: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  
  // Holiday details
  date: {
    type: Date,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['National', 'Regional', 'Religious', 'Company'],
    default: 'National',
    index: true
  },
  applicableTo: {
    type: String,
    default: 'All Stores',
    trim: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    default: null
  },
  region: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Metadata
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
holidaySchema.index({ tenantId: 1, date: 1 });
holidaySchema.index({ tenantId: 1, year: 1 });
holidaySchema.index({ tenantId: 1, type: 1 });
holidaySchema.index({ tenantId: 1, isActive: 1 });

// Virtual for year
holidaySchema.virtual('year').get(function() {
  return this.date ? this.date.getFullYear() : null;
});

module.exports = mongoose.model('Holiday', holidaySchema);
