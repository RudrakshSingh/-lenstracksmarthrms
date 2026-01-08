const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // Name fields
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  fatherName: {
    type: String,
    trim: true
  },
  // Personal details
  dob: {
    type: Date
  },
  avatar: {
    type: String,
    trim: true
  },
  // Statutory fields
  aadharMasked: {
    type: String,
    trim: true
  },
  panNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  uan: {
    type: String,
    trim: true
  },
  esiNo: {
    type: String,
    trim: true
  },
  // Contact fields
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  // Work details
  designation: {
    type: String,
    required: true,
    trim: true
  },
  jobTitle: {
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
  roleFamily: {
    type: String,
    enum: ['Sales', 'Optometry', 'Tech', 'Finance', 'HR', 'Operations', 'Warehouse', 'Lab', 'Fitting', 'Delivery', 'Engineering', 'Marketing', 'Support'],
    required: false
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  salary: {
    type: String,
    trim: true
  },
  // Reporting structure
  reportingManager: {
    type: String,  // Simple string field for manager ID or name
    trim: true
  },
  reportingManagerName: {
    type: String,
    trim: true
  },
  reportingManagerDetails: {  // Complex nested object (backward compatibility)
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    name: {
      type: String,
      trim: true
    },
    designation: {
      type: String,
      trim: true
    }
  },
  // Location details
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
  // Emergency contact
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
  // Bank details
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
  // Documents
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
  // Previous employment
  previousEmployment: {
    has_previous_employment: Boolean,
    employer_name: String,
    from_date: Date,
    to_date: Date,
    form_16_available: Boolean
  },
  // Dates
  doj: {
    type: Date,
    required: true
  },
  confirmationDate: {
    type: Date
  },
  // Status (CRITICAL: lowercase only)
  status: {
    type: String,
    enum: ['active', 'inactive', 'terminated', 'on-leave'],
    default: 'active',
    lowercase: true
  },
  // Legacy timestamps
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true  // This adds createdAt and updatedAt automatically
});

// Indexes (remove duplicates of field indexes)
employeeSchema.index({ roleFamily: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ status: 1 });

module.exports = mongoose.model('Employee', employeeSchema);
