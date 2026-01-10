const mongoose = require('mongoose');

/**
 * Roster Schema - Manages employee work schedules and shift assignments
 */
const rosterSchema = new mongoose.Schema({
  // Tenant for multi-tenancy
  tenantId: {
    type: String,
    default: 'default',
    required: true,
    index: true
  },

  // Employee Information
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  employeeId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  employeeName: {
    type: String,
    required: true,
    trim: true
  },

  // Store Information
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true
  },
  storeId: {
    type: String,
    required: true,
    trim: true
  },
  storeName: {
    type: String,
    required: true,
    trim: true
  },

  // Date and Shift Information
  date: {
    type: Date,
    required: true,
    index: true
  },
  shift: {
    type: String,
    enum: ['MORNING', 'EVENING', 'NIGHT', 'FULL_DAY'],
    required: true,
    default: 'MORNING'
  },
  shiftStart: {
    type: String, // Format: "HH:MM" (e.g., "09:00")
    required: true,
    trim: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time in HH:MM format']
  },
  shiftEnd: {
    type: String, // Format: "HH:MM" (e.g., "18:00")
    required: true,
    trim: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time in HH:MM format']
  },

  // Status
  status: {
    type: String,
    enum: ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
    default: 'SCHEDULED',
    required: true
  },

  // Additional Information
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // Break Information
  breakDuration: {
    type: Number, // in minutes
    default: 30,
    min: 0,
    max: 120
  },

  // Creation and Update Information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'rosters'
});

// Compound Indexes
rosterSchema.index({ employee: 1, date: 1 }); // For employee schedule lookup
rosterSchema.index({ store: 1, date: 1 }); // For store roster lookup
rosterSchema.index({ tenantId: 1, date: 1 }); // For tenant-wide roster queries
rosterSchema.index({ date: 1, status: 1 }); // For date and status filtering

// Unique constraint: One employee cannot be assigned to multiple stores on the same date and overlapping shift
rosterSchema.index(
  { employee: 1, date: 1, shiftStart: 1 },
  { unique: true, name: 'unique_employee_date_shift' }
);

// Virtual for full shift duration (in hours)
rosterSchema.virtual('shiftDurationHours').get(function() {
  if (!this.shiftStart || !this.shiftEnd) return 0;
  
  const [startHour, startMin] = this.shiftStart.split(':').map(Number);
  const [endHour, endMin] = this.shiftEnd.split(':').map(Number);
  
  let durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
  
  // Handle overnight shifts
  if (durationMinutes < 0) {
    durationMinutes += 24 * 60;
  }
  
  // Subtract break duration
  durationMinutes -= (this.breakDuration || 0);
  
  return (durationMinutes / 60).toFixed(2);
});

// Virtual for working hours (excluding breaks)
rosterSchema.virtual('workingHours').get(function() {
  return this.shiftDurationHours;
});

// Pre-save middleware to update timestamps
rosterSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to check for overlapping shifts
rosterSchema.statics.checkOverlap = async function(employeeId, date, shiftStart, shiftEnd, excludeRosterId = null) {
  const query = {
    employeeId,
    date: new Date(date),
    status: { $nin: ['CANCELLED'] }
  };
  
  if (excludeRosterId) {
    query._id = { $ne: excludeRosterId };
  }
  
  const existingRosters = await this.find(query);
  
  for (const roster of existingRosters) {
    // Convert time strings to minutes for comparison
    const [existingStartH, existingStartM] = roster.shiftStart.split(':').map(Number);
    const [existingEndH, existingEndM] = roster.shiftEnd.split(':').map(Number);
    const [newStartH, newStartM] = shiftStart.split(':').map(Number);
    const [newEndH, newEndM] = shiftEnd.split(':').map(Number);
    
    const existingStartMin = existingStartH * 60 + existingStartM;
    const existingEndMin = existingEndH * 60 + existingEndM;
    const newStartMin = newStartH * 60 + newStartM;
    const newEndMin = newEndH * 60 + newEndM;
    
    // Check for overlap
    if (
      (newStartMin < existingEndMin && newEndMin > existingStartMin) ||
      (newStartMin === existingStartMin && newEndMin === existingEndMin)
    ) {
      return true; // Overlap detected
    }
  }
  
  return false; // No overlap
};

// Static method to get store roster for a date range
rosterSchema.statics.getStoreRoster = async function(storeId, startDate, endDate, status = null) {
  const query = {
    storeId,
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };
  
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('employee', 'firstName lastName email phone')
    .populate('store', 'name code address')
    .sort({ date: 1, shiftStart: 1 });
};

// Static method to get employee roster for a date range
rosterSchema.statics.getEmployeeRoster = async function(employeeId, startDate, endDate) {
  return this.find({
    employeeId,
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    },
    status: { $nin: ['CANCELLED'] }
  })
    .populate('store', 'name code address')
    .sort({ date: 1, shiftStart: 1 });
};

// Export model
const Roster = mongoose.model('Roster', rosterSchema);

module.exports = Roster;
