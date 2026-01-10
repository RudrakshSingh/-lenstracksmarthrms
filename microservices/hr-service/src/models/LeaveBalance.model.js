const mongoose = require('mongoose');

/**
 * Leave Balance Schema - Tracks employee leave balances
 */
const leaveBalanceSchema = new mongoose.Schema({
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
    unique: true,
    index: true
  },
  employeeId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },

  // Casual Leave
  casualLeave: {
    total: {
      type: Number,
      default: 12,
      min: 0
    },
    used: {
      type: Number,
      default: 0,
      min: 0
    },
    available: {
      type: Number,
      default: 12,
      min: 0
    }
  },

  // Sick Leave
  sickLeave: {
    total: {
      type: Number,
      default: 6,
      min: 0
    },
    used: {
      type: Number,
      default: 0,
      min: 0
    },
    available: {
      type: Number,
      default: 6,
      min: 0
    }
  },

  // Earned Leave (Privilege Leave)
  earnedLeave: {
    total: {
      type: Number,
      default: 15,
      min: 0
    },
    used: {
      type: Number,
      default: 0,
      min: 0
    },
    available: {
      type: Number,
      default: 15,
      min: 0
    }
  },

  // Paid Leave
  paidLeave: {
    total: {
      type: Number,
      default: 10,
      min: 0
    },
    used: {
      type: Number,
      default: 0,
      min: 0
    },
    available: {
      type: Number,
      default: 10,
      min: 0
    }
  },

  // Maternity/Paternity Leave
  maternityPaternityLeave: {
    total: {
      type: Number,
      default: 0,
      min: 0
    },
    used: {
      type: Number,
      default: 0,
      min: 0
    },
    available: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Compensatory Off
  compensatoryOff: {
    total: {
      type: Number,
      default: 0,
      min: 0
    },
    used: {
      type: Number,
      default: 0,
      min: 0
    },
    available: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Leave year (e.g., 2026)
  leaveYear: {
    type: Number,
    required: true,
    default: () => new Date().getFullYear()
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
  collection: 'leave_balances'
});

// Compound index for unique employee-year combination
leaveBalanceSchema.index({ employee: 1, leaveYear: 1 }, { unique: true });

// Pre-save middleware to calculate available leaves
leaveBalanceSchema.pre('save', function(next) {
  this.casualLeave.available = Math.max(0, this.casualLeave.total - this.casualLeave.used);
  this.sickLeave.available = Math.max(0, this.sickLeave.total - this.sickLeave.used);
  this.earnedLeave.available = Math.max(0, this.earnedLeave.total - this.earnedLeave.used);
  this.paidLeave.available = Math.max(0, this.paidLeave.total - this.paidLeave.used);
  this.maternityPaternityLeave.available = Math.max(0, this.maternityPaternityLeave.total - this.maternityPaternityLeave.used);
  this.compensatoryOff.available = Math.max(0, this.compensatoryOff.total - this.compensatoryOff.used);
  
  this.updatedAt = new Date();
  next();
});

// Static method to initialize leave balance for a new employee
leaveBalanceSchema.statics.initializeForEmployee = async function(employeeId, employeeMongoId, tenantId = 'default', leaveYear = null) {
  const year = leaveYear || new Date().getFullYear();
  
  const leaveBalance = new this({
    tenantId,
    employee: employeeMongoId,
    employeeId,
    leaveYear: year,
    casualLeave: { total: 12, used: 0, available: 12 },
    sickLeave: { total: 6, used: 0, available: 6 },
    earnedLeave: { total: 15, used: 0, available: 15 },
    paidLeave: { total: 10, used: 0, available: 10 },
    maternityPaternityLeave: { total: 0, used: 0, available: 0 },
    compensatoryOff: { total: 0, used: 0, available: 0 }
  });
  
  await leaveBalance.save();
  return leaveBalance;
};

// Static method to deduct leave balance
leaveBalanceSchema.statics.deductLeave = async function(employeeMongoId, leaveType, days) {
  const balance = await this.findOne({ employee: employeeMongoId, leaveYear: new Date().getFullYear() });
  if (!balance) {
    throw new Error('Leave balance not found for employee');
  }
  
  const typeMap = {
    'CASUAL': 'casualLeave',
    'SICK': 'sickLeave',
    'EARNED': 'earnedLeave',
    'PAID': 'paidLeave',
    'MATERNITY': 'maternityPaternityLeave',
    'PATERNITY': 'maternityPaternityLeave',
    'COMP_OFF': 'compensatoryOff'
  };
  
  const field = typeMap[leaveType];
  if (!field) {
    throw new Error('Invalid leave type');
  }
  
  if (balance[field].available < days) {
    throw new Error(`Insufficient ${leaveType} leave balance`);
  }
  
  balance[field].used += days;
  await balance.save();
  
  return balance;
};

// Static method to add compensatory off
leaveBalanceSchema.statics.addCompensatoryOff = async function(employeeMongoId, days) {
  const balance = await this.findOne({ employee: employeeMongoId, leaveYear: new Date().getFullYear() });
  if (!balance) {
    throw new Error('Leave balance not found for employee');
  }
  
  balance.compensatoryOff.total += days;
  await balance.save();
  
  return balance;
};

// Export model
const LeaveBalance = mongoose.model('LeaveBalance', leaveBalanceSchema);

module.exports = LeaveBalance;

