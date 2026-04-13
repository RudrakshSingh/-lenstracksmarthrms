const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
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
  // CRITICAL: Auth-service compatibility field
  employee_id: {
    type: String,
    required: false, // Not required in HR service, but set for auth-service compatibility
    trim: true,
    uppercase: true,
    index: true // OPTIMIZED: Add index for faster lookups
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
  // CRITICAL: Auth-service compatibility field
  name: {
    type: String,
    required: false, // Not required in HR service, but set for auth-service compatibility
    trim: true,
    maxlength: 200
  },
  avatar: {
    type: String,
    trim: true,
    maxlength: 500 // Support URLs up to 500 characters
    // Can be: empty string, emoji (1-2 chars), or URL (http:// or https://)
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
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
    required: false, // Optional - not always provided during employee creation
    trim: true,
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
  },
  
  // ============================================
  // Authentication
  // ============================================
  password: {
    type: String,
    required: false, // Optional - auth service handles password creation
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
    required: false // Optional - will be assigned after employee creation
  },
  // Direct permissions on user (for auth-service compatibility)
  permissions: [{
    type: String
  }],
  // Extra allows on top of role (sync with auth-service when mirroring users)
  custom_permissions: [{
    type: String,
    trim: true
  }],
  permission_denials: [{
    type: String,
    trim: true
  }],
  permissionsRevision: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // ============================================
  // Work Details
  // ============================================
  department: {
    type: String,
    trim: true,
    index: true // Add index for faster queries
  },
  departmentRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
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
  // ============================================
  // Salary Structure (DEPRECATED: salary field)
  // ============================================
  // DEPRECATED: Use annual_ctc instead. Kept for data migration purposes.
  salary: {
    type: String,
    trim: true,
    select: false // Don't return in queries by default
  },
  // New salary structure
  annual_ctc: {
    type: Number,
    min: 0,
    max: 99999999.99, // 10 crore max
    default: 0
  },
  salary_breakdown: {
    basic: {
      type: Number,
      min: 0,
      default: 0
    },
    hra: {
      type: Number,
      min: 0,
      default: 0
    },
    special_allowance: {
      type: Number,
      min: 0,
      default: 0
    },
    pf_employer: {
      type: Number,
      min: 0,
      default: 0
    },
    gratuity: {
      type: Number,
      min: 0,
      default: 0
    },
    other_allowances: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  
  // ============================================
  // Sales-Specific Fields (Only for Sales department)
  // ============================================
  target_sales: {
    type: Number,
    min: 0,
    default: 0
  },
  incentive_slabs: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    min_sales: {
      type: Number,
      required: true,
      min: 0
    },
    max_sales: {
      type: Number,
      required: true,
      min: 0
    },
    incentive_percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    active: {
      type: Boolean,
      default: true
    }
  }],
  pan_number: {
    type: String,
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format (ABCDE1234F)']
  },
  tax_state: {
    type: String,
    trim: true
  },
  leave_entitlements: {
    casual_leave: {
      type: Number,
      default: 12,
      min: 0
    },
    sick_leave: {
      type: Number,
      default: 12,
      min: 0
    },
    privilege_leave: {
      type: Number,
      default: 21,
      min: 0
    }
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
  workMode: {
    type: String,
    enum: ['STORE_BOUND', 'BACKOFFICE', 'ROAMING'],
    default: 'STORE_BOUND'
  },
  attendancePolicy: {
    type: String,
    enum: ['STRICT_GEOFENCE', 'NO_GEOFENCE', 'FLEXI_SHIFT'],
    default: 'STRICT_GEOFENCE'
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
  // CRITICAL: Auth-service compatibility field
  joining_date: {
    type: Date,
    required: false // Not required in HR service, but set for auth-service compatibility
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
// CRITICAL: Compound index for tenant isolation - ensures employeeId is unique per tenant
userSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true });
// Index for tenant-based queries (most common query pattern)
userSchema.index({ tenantId: 1, status: 1 });
userSchema.index({ tenantId: 1, department: 1 });
// CRITICAL: Compound index for direct MongoDB _id lookups with tenant filtering (performance optimization)
userSchema.index({ _id: 1, tenantId: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to sync auth-service compatibility fields
userSchema.pre('save', function(next) {
  // CRITICAL: Sync employee_id from employeeId (auth-service compatibility)
  if (this.employeeId && !this.employee_id) {
    this.employee_id = this.employeeId;
  } else if (this.employee_id && !this.employeeId) {
    this.employeeId = this.employee_id;
  }
  
  // CRITICAL: Sync name from firstName/lastName (auth-service compatibility)
  if (!this.name && this.firstName) {
    this.name = this.lastName ? `${this.firstName} ${this.lastName}`.trim() : this.firstName;
  }
  
  // CRITICAL: Sync joining_date from doj (auth-service compatibility)
  if (this.doj && !this.joining_date) {
    this.joining_date = this.doj;
  } else if (this.joining_date && !this.doj) {
    this.doj = this.joining_date;
  } else if (!this.joining_date && !this.doj && this.isNew) {
    // Set default joining_date for new employees
    this.joining_date = new Date();
    this.doj = new Date();
  }
  
  next();
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


// Performance indexes for common queries
userSchema.index({ tenantId: 1, email: 1 }); // Fast email lookup
userSchema.index({ tenantId: 1, employeeId: 1, status: 1 }); // Active employees by tenant
userSchema.index({ tenantId: 1, employee_id: 1, status: 1 }); // OPTIMIZED: Fast employee_id lookup
userSchema.index({ tenantId: 1, department: 1, status: 1 }); // Department employees
userSchema.index({ tenantId: 1, store: 1, status: 1 }); // Store employees
userSchema.index({ tenantId: 1, isDeleted: 1, status: 1 }); // OPTIMIZED: Common query pattern
userSchema.index({ createdAt: -1 }); // Recent employees
