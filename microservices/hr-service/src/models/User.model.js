const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
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
    trim: true,
    maxlength: 100
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    index: true
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  
  // Role and Permissions
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  
  // Department and Store
  department: {
    type: String,
    trim: true
  },
  jobTitle: {
    type: String,
    trim: true
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },
  
  // Status
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
  },
  
  // Address
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zip: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' }
  },
  
  // Date of Birth
  dateOfBirth: {
    type: Date
  },
  
  // Refresh Token
  refreshToken: {
    type: String,
    select: false
  },
  
  // Last login tracking
  lastLogin: {
    type: Date
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ employeeId: 1 });
userSchema.index({ status: 1 });
userSchema.index({ isDeleted: 1 });
userSchema.index({ store: 1 });
userSchema.index({ role: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if user is active
userSchema.methods.isActive = function() {
  return this.is_active && this.status === 'active' && !this.isDeleted;
};

// Static method to find active users
userSchema.statics.findActive = function() {
  return this.find({ is_active: true, status: 'active', isDeleted: false });
};

module.exports = mongoose.model('User', userSchema);

