const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // ============================================
  // Basic Information
  // ============================================
  employeeId: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    index: true
  },
  code: {
    type: String,
    trim: true,
    uppercase: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  lastName: {
    type: String,
    required: false,
    trim: true,
    maxlength: 100,
    default: ''
  },
  avatar: {
    type: String,
    trim: true
  },
  
  // ============================================
  // Contact Information
  // ============================================
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
  
  // ============================================
  // Authentication
  // ============================================
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  refreshToken: {
    type: String,
    select: false
  },
  
  // ============================================
  // Role and Permissions
  // ============================================
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  
  // ============================================
  // Work Details
  // ============================================
  department: {
    type: String,
    trim: true
  },
  designation: {
    type: String,
    trim: true
  },
  jobTitle: {
    type: String,
    trim: true
  },
  roleFamily: {
    type: String,
    trim: true
  },
  gradeBand: {
    type: String,
    trim: true
  },
  grade_band: {
    type: String,
    trim: true
  },
  salary: {
    type: String,
    trim: true
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },
  
  // ============================================
  // Reporting Structure
  // ============================================
  reportingManager: {
    type: String,
    trim: true
  },
  reportingManagerName: {
    type: String,
    trim: true
  },
  
  // ============================================
  // Work Location (Nested Object)
  // ============================================
  workLocation: {
    storeId: {
      type: String,
      trim: true
    },
    storeName: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    pincode: {
      type: String,
      trim: true
    }
  },
  
  // ============================================
  // Addresses
  // ============================================
  // Legacy address field (backward compatibility)
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zip: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' }
  },
  // Current address (new format)
  currentAddress: {
    lines: [String],
    city: String,
    state: String,
    pincode: String,
    country: {
      type: String,
      default: 'India'
    }
  },
  
  // ============================================
  // Emergency Contact
  // ============================================
  emergencyContact: {
    name: {
      type: String,
      trim: true
    },
    relationship: {
      type: String,
      enum: ['Father', 'Mother', 'Spouse', 'Sibling', 'Child', 'Friend', 'Other'],
      trim: true
    },
    phone: {
      type: String,
      trim: true
    }
  },
  
  // ============================================
  // Important Dates
  // ============================================
  doj: {
    type: Date
  },
  dob: {
    type: Date
  },
  dateOfBirth: {
    type: Date
  },
  confirmationDate: {
    type: Date
  },
  
  // ============================================
  // Statutory Information
  // ============================================
  uan: {
    type: String,
    trim: true
  },
  esiNo: {
    type: String,
    trim: true
  },
  panNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  aadharMasked: {
    type: String,
    trim: true
  },
  
  // ============================================
  // Bank Details
  // ============================================
  bankAccount: {
    accountNumber: {
      type: String,
      trim: true
    },
    ifscCode: {
      type: String,
      trim: true,
      uppercase: true
    },
    bankName: {
      type: String,
      trim: true
    },
    branchName: {
      type: String,
      trim: true
    },
    accountType: {
      type: String,
      enum: ['Savings', 'Current', 'Salary'],
      trim: true
    }
  },
  
  // ============================================
  // Previous Employment
  // ============================================
  previousEmployment: {
    has_previous_employment: Boolean,
    employer_name: String,
    from_date: Date,
    to_date: Date,
    form_16_available: Boolean
  },
  
  // ============================================
  // Documents (New Format)
  // ============================================
  documents: [{
    type: {
      type: String,
      trim: true
    },
    url: {
      type: String,
      trim: true
    },
    uploaded_at: {
      type: Date,
      default: Date.now
    }
  }],
  
  // ============================================
  // Onboarding Documents (Legacy Format)
  // ============================================
  onboardingDocuments: [{
    type: {
      type: String,
      enum: [
        'AADHAR',
        'PAN',
        'PASSPORT',
        'DRIVING_LICENSE',
        'EDUCATION_CERTIFICATE',
        'EXPERIENCE_CERTIFICATE',
        'BANK_STATEMENT',
        'PHOTO',
        'SIGNATURE',
        'OTHER'
      ],
      required: true
    },
    name: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: {
      type: Date
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed
    }
  }],
  
  // ============================================
  // Status (CRITICAL: lowercase with hyphen)
  // ============================================
  status: {
    type: String,
    enum: ['active', 'inactive', 'on-leave', 'terminated', 'pending'],
    default: 'active',
    lowercase: true,
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
  
  // ============================================
  // Tracking
  // ============================================
  lastLogin: {
    type: Date
  },
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

// Indexes (field-level indexes already declared; keep only necessary refs)
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

