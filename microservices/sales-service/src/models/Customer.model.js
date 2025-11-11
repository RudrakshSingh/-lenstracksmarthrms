const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customer_id: {
    type: String,
    unique: true,
    trim: true
  },
  full_name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    index: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  is_active: {
    type: Boolean,
    default: true
  },
  last_purchase_date: {
    type: Date
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
  timestamps: true,
  collection: 'customers'
});

// Indexes
customerSchema.index({ phone: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ customer_id: 1 });

// Pre-save middleware
customerSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Generate customer_id if not provided
  if (!this.customer_id) {
    this.customer_id = `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }
  
  next();
});

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;

