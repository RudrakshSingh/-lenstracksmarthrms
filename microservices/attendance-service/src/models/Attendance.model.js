const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  // Employee Information
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employee_id: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },

  // Store Information
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  store_code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },

  // Date and Time
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  check_in_time: {
    type: Date
  },
  check_out_time: {
    type: Date
  },

  // Location Information
  check_in_location: {
    latitude: {
      type: Number,
      required: function() { return !!this.check_in_time; },
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: function() { return !!this.check_in_time; },
      min: -180,
      max: 180
    },
    address: {
      type: String,
      trim: true
    },
    accuracy: {
      type: Number // GPS accuracy in meters
    }
  },
  check_out_location: {
    latitude: {
      type: Number,
      required: function() { return !!this.check_out_time; },
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: function() { return !!this.check_out_time; },
      min: -180,
      max: 180
    },
    address: {
      type: String,
      trim: true
    },
    accuracy: {
      type: Number // GPS accuracy in meters
    }
  },

  // Selfie Verification
  check_in_selfie: {
    public_id: String,
    secure_url: String,
    uploaded_at: Date
  },
  check_out_selfie: {
    public_id: String,
    secure_url: String,
    uploaded_at: Date
  },

  // Work Duration
  total_hours: {
    type: Number,
    default: 0,
    min: 0,
    max: 24
  },
  break_duration: {
    type: Number,
    default: 0,
    min: 0,
    max: 8
  },
  overtime_hours: {
    type: Number,
    default: 0,
    min: 0
  },

  // Status and Approval
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half_day', 'overtime', 'pending_approval', 'approved', 'rejected'],
    default: 'pending_approval'
  },
  is_approved: {
    type: Boolean,
    default: false
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approved_at: {
    type: Date
  },
  approval_notes: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // Attendance Type
  attendance_type: {
    type: String,
    enum: ['regular', 'work_from_home', 'field_work', 'training', 'meeting', 'other'],
    default: 'regular'
  },

  // Notes and Comments
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  manager_notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },

  // Geofencing Status
  geofence_status: {
    type: String,
    enum: ['valid', 'invalid', 'not_checked'],
    default: 'not_checked'
  },
  
  // Logout Information
  logout_reason: {
    type: String,
    enum: ['manual', 'auto_geofence', 'admin_action', 'system'],
    default: 'manual'
  },

  // Flags
  is_late: {
    type: Boolean,
    default: false
  },
  is_early_departure: {
    type: Boolean,
    default: false
  },
  is_geofence_violation: {
    type: Boolean,
    default: false
  },
  is_selfie_verified: {
    type: Boolean,
    default: false
  },

  // System Fields
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
attendanceSchema.index({ employee: 1, date: 1 });
attendanceSchema.index({ employee_id: 1, date: 1 });
attendanceSchema.index({ store: 1, date: 1 });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ is_approved: 1 });
attendanceSchema.index({ approved_by: 1 });
attendanceSchema.index({ created_at: -1 });
attendanceSchema.index({ check_in_time: -1 }); // Added for clock-in queries
attendanceSchema.index({ employee: 1, check_in_time: -1 }); // Added for open session queries

// Compound indexes for efficient queries
attendanceSchema.index({ employee: 1, date: -1 });
attendanceSchema.index({ store: 1, date: -1 });
attendanceSchema.index({ employee: 1, status: 1, date: -1 });

// Virtual for work duration in hours
attendanceSchema.virtual('work_duration_hours').get(function() {
  if (this.check_in_time && this.check_out_time) {
    const diffTime = Math.abs(this.check_out_time - this.check_in_time);
    const diffHours = diffTime / (1000 * 60 * 60);
    return Math.round(diffHours * 100) / 100; // Round to 2 decimal places
  }
  return 0;
});

// Virtual for is present today
attendanceSchema.virtual('is_present_today').get(function() {
  const today = new Date();
  const attendanceDate = new Date(this.date);
  return attendanceDate.toDateString() === today.toDateString() && 
         this.status === 'present' && 
         this.is_approved;
});

// Pre-save middleware to calculate total hours
attendanceSchema.pre('save', function(next) {
  if (this.check_in_time && this.check_out_time) {
    const diffTime = Math.abs(this.check_out_time - this.check_in_time);
    this.total_hours = Math.round((diffTime / (1000 * 60 * 60)) * 100) / 100;
    
    // Calculate overtime (assuming 8 hours is standard)
    if (this.total_hours > 8) {
      this.overtime_hours = this.total_hours - 8;
    }
  }
  next();
});

// Pre-save middleware to set employee_id
attendanceSchema.pre('save', async function(next) {
  if (this.isNew && this.employee && !this.employee_id) {
    const user = await mongoose.model('User').findById(this.employee);
    if (user) {
      this.employee_id = user.employee_id;
    }
  }
  next();
});

// Pre-save middleware to set store_code
attendanceSchema.pre('save', async function(next) {
  if (this.isNew && this.store && !this.store_code) {
    const store = await mongoose.model('Store').findById(this.store);
    if (store) {
      this.store_code = store.code;
    }
  }
  next();
});

// Static method to find by employee and date
attendanceSchema.statics.findByEmployeeAndDate = function(employeeId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.findOne({
    employee: employeeId,
    date: { $gte: startOfDay, $lte: endOfDay }
  });
};

// Static method to find by employee and date range
attendanceSchema.statics.findByEmployeeAndDateRange = function(employeeId, startDate, endDate) {
  return this.find({
    employee: employeeId,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: -1 });
};

// Static method to find by store and date
attendanceSchema.statics.findByStoreAndDate = function(storeId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.find({
    store: storeId,
    date: { $gte: startOfDay, $lte: endOfDay }
  });
};

// Static method to find pending approvals
attendanceSchema.statics.findPendingApprovals = function() {
  return this.find({ 
    status: 'pending_approval',
    is_approved: false 
  }).populate('employee', 'name employee_id').populate('store', 'name code');
};

// Static method to get attendance statistics
attendanceSchema.statics.getAttendanceStats = async function(employeeId, startDate, endDate) {
  const pipeline = [
    {
      $match: {
        employee: mongoose.Types.ObjectId(employeeId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalHours: { $sum: '$total_hours' },
        totalOvertime: { $sum: '$overtime_hours' }
      }
    }
  ];

  return this.aggregate(pipeline);
};

// Static method to get store attendance statistics
attendanceSchema.statics.getStoreAttendanceStats = async function(storeId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const pipeline = [
    {
      $match: {
        store: mongoose.Types.ObjectId(storeId),
        date: { $gte: startOfDay, $lte: endOfDay }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalHours: { $sum: '$total_hours' }
      }
    }
  ];

  return this.aggregate(pipeline);
};

// Instance method to check if employee is checked in
attendanceSchema.methods.isCheckedIn = function() {
  return !!this.check_in_time && !this.check_out_time;
};

// Instance method to check if employee is checked out
attendanceSchema.methods.isCheckedOut = function() {
  return !!this.check_in_time && !!this.check_out_time;
};

// Instance method to get attendance summary
attendanceSchema.methods.getSummary = function() {
  return {
    employee_id: this.employee_id,
    date: this.date,
    check_in_time: this.check_in_time,
    check_out_time: this.check_out_time,
    total_hours: this.total_hours,
    status: this.status,
    is_approved: this.is_approved,
    attendance_type: this.attendance_type
  };
};

module.exports = mongoose.model('Attendance', attendanceSchema);