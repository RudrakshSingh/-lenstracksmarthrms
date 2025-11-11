const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Log Identification
  log_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  
  // Actor
  actor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  actor_name: {
    type: String,
    required: true
  },
  actor_role: {
    type: String,
    required: true
  },
  actor_email: {
    type: String
  },
  
  // Action
  action: {
    type: String,
    required: true,
    enum: [
      'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOCK', 'UNLOCK', 'POST', 'CANCEL',
      'SUBMIT', 'WITHDRAW', 'ASSIGN', 'TRANSFER', 'OVERRIDE', 'EXPORT', 'IMPORT', 'LOGIN', 'LOGOUT',
      'VIEW', 'DOWNLOAD', 'UPLOAD', 'SIGN', 'FILE', 'PAY', 'CALCULATE', 'GENERATE'
    ],
    index: true
  },
  action_details: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Entity
  entity: {
    type: String,
    required: true,
    enum: [
      'EMPLOYEE', 'LEAVE_REQUEST', 'LEAVE_POLICY', 'LEAVE_LEDGER', 'PAYROLL_RUN', 'PAYROLL_COMPONENT',
      'PAYROLL_OVERRIDE', 'INCENTIVE_CLAIM', 'RETURNS_REMAKES', 'STAT_EXPORT', 'FNF_CASE',
      'STORE', 'TRANSFER', 'HR_LETTER', 'ATTENDANCE', 'SALARY'
    ],
    index: true
  },
  entity_id: {
    type: String,
    required: true,
    index: true
  },
  entity_name: {
    type: String
  },
  
  // Snapshot (Before & After)
  snapshot: {
    before: {
      type: mongoose.Schema.Types.Mixed
    },
    after: {
      type: mongoose.Schema.Types.Mixed
    },
    changes: [{
      field: String,
      old_value: mongoose.Schema.Types.Mixed,
      new_value: mongoose.Schema.Types.Mixed
    }]
  },
  
  // Request Details
  request: {
    ip_address: {
      type: String
    },
    user_agent: {
      type: String
    },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    },
    endpoint: {
      type: String
    },
    request_id: {
      type: String
    }
  },
  
  // Result
  result: {
    success: {
      type: Boolean,
      required: true,
      default: true
    },
    error_message: {
      type: String
    },
    status_code: {
      type: Number
    }
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Timestamp
  created_at: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false // We only want created_at
});

// Indexes
auditLogSchema.index({ actor_id: 1, created_at: -1 });
auditLogSchema.index({ entity: 1, entity_id: 1, created_at: -1 });
auditLogSchema.index({ action: 1, created_at: -1 });
auditLogSchema.index({ created_at: -1 });

// Compound index for common queries
auditLogSchema.index({ entity: 1, entity_id: 1, action: 1, created_at: -1 });

// Pre-save middleware
auditLogSchema.pre('save', function(next) {
  // Generate log_id if not provided
  if (!this.log_id) {
    this.log_id = `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Calculate changes if both before and after exist
  if (this.snapshot.before && this.snapshot.after) {
    this.snapshot.changes = this.calculateChanges(this.snapshot.before, this.snapshot.after);
  }
  
  next();
});

// Method to calculate changes
auditLogSchema.methods.calculateChanges = function(before, after) {
  const changes = [];
  const beforeKeys = Object.keys(before);
  const afterKeys = Object.keys(after);
  const allKeys = new Set([...beforeKeys, ...afterKeys]);
  
  allKeys.forEach(key => {
    const oldValue = before[key];
    const newValue = after[key];
    
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field: key,
        old_value: oldValue,
        new_value: newValue
      });
    }
  });
  
  return changes;
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;

