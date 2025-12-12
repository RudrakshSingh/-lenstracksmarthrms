const mongoose = require('mongoose');

// Simplified User model for payroll service
// In a microservice architecture, this could reference the auth-service
// For now, we'll create a minimal model for payroll operations
const userSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    index: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'on_leave', 'terminated', 'pending'],
    default: 'active',
    index: true
  },
  is_active: {
    type: Boolean,
    default: true,
    index: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ employeeId: 1 });
userSchema.index({ status: 1 });
userSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('User', userSchema);

