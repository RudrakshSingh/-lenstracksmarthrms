const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  // ============================================
  // Tenant Isolation (CRITICAL)
  // ============================================
  tenantId: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true // Critical for tenant isolation queries
  },
  
  name: {
    type: String,
    required: true,
    trim: true
    // Removed unique: true - now unique per tenant
  },
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
    // Removed unique: true - now unique per tenant
  },
  description: {
    type: String,
    trim: true
  },
  head: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  parent_department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
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

// Update timestamp on save
departmentSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// CRITICAL: Indexes for tenant isolation
// Compound index ensures name and code are unique per tenant
departmentSchema.index({ tenantId: 1, name: 1 }, { unique: true });
departmentSchema.index({ tenantId: 1, code: 1 }, { unique: true });
// Index for tenant-based queries
departmentSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('Department', departmentSchema);

