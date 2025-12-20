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
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  fatherName: {
    type: String,
    trim: true
  },
  dob: {
    type: Date
  },
  aadharMasked: {
    type: String,
    trim: true
  },
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
  designation: {
    type: String,
    required: true,
    trim: true
  },
  gradeBand: {
    type: String,
    trim: true
  },
  roleFamily: {
    type: String,
    enum: ['Sales', 'Optometry', 'Tech', 'Finance', 'HR', 'Operations', 'Warehouse', 'Lab', 'Fitting', 'Delivery'],
    required: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  reportingManager: {
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
  doj: {
    type: Date,
    required: true
  },
  confirmationDate: {
    type: Date
  },
  uan: {
    type: String,
    trim: true
  },
  esiNo: {
    type: String,
    trim: true
  },
  currentAddress: {
    lines: [String],
    city: String,
    state: String,
    pincode: String
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE'],
    default: 'ACTIVE'
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

// Indexes (remove duplicates of field indexes)
employeeSchema.index({ roleFamily: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ status: 1 });

module.exports = mongoose.model('Employee', employeeSchema);
