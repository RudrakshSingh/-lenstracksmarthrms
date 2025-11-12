const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    enum: ['superadmin', 'admin', 'hr', 'manager', 'employee'],
    index: true
  },
  display_name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  permissions: [{
    type: String,
    enum: [
      // User Management
      'read_users', 'write_users', 'delete_users',
      'create_users', 'update_users', 'activate_users', 'deactivate_users',
      'user:read', 'user:create', 'user:update', 'user:delete',
      
      // HR Management
      'read_hr', 'write_hr', 'create_hr', 'update_hr', 'delete_hr',
      
      // Leave Management
      'read_leave', 'write_leave', 'create_leave', 'update_leave', 'approve_leave',
      'hr.leave.read', 'hr.leave.create', 'hr.leave.update', 'hr.leave.approve',
      'hr.leave.yearclose',
      
      // Payroll Management
      'read_payroll', 'write_payroll', 'create_payroll', 'update_payroll', 'process_payroll',
      'hr.payroll.read', 'hr.payroll.create', 'hr.payroll.update', 'hr.payroll.process',
      'hr.payroll.lock', 'hr.payroll.post', 'hr.payroll.override',
      
      // Store Management
      'read_stores', 'write_stores', 'create_stores', 'update_stores', 'delete_stores',
      'store:read', 'store:create', 'store:update', 'store:delete',
      
      // Role Management
      'read_roles', 'write_roles', 'create_roles', 'update_roles',
      'role:assign', 'role:read', 'role:update',
      
      // Transfer Management
      'transfer:read', 'transfer:create', 'transfer:update', 'transfer:approve', 'transfer:request',
      
      // Reports
      'read_reports', 'write_reports', 'export_reports',
      'hr.reports.read',
      
      // Audit
      'read_audit', 'view_audit_logs',
      'hr.audit.read', 'hr.audit.verify',
      
      // F&F Settlement
      'hr.fnf.read', 'hr.fnf.create', 'hr.fnf.update', 'hr.fnf.approve', 'hr.fnf.payout',
      
      // Incentive & Claw-back
      'hr.incentive.read', 'hr.incentive.create', 'hr.incentive.approve',
      'hr.clawback.apply',
      
      // Statutory
      'hr.statutory.read', 'hr.statutory.export', 'hr.statutory.validate',
      
      // HR Letters
      'hr.letters.create', 'hr.letters.read', 'hr.letters.update', 'hr.letters.submit',
      'hr.letters.approve',
      
      // Wildcard for admin
      '*'
    ]
  }],
  is_active: {
    type: Boolean,
    default: true,
    index: true
  },
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
roleSchema.index({ name: 1 });
roleSchema.index({ is_active: 1 });

// Virtual for permission count
roleSchema.virtual('permission_count').get(function() {
  return this.permissions.length;
});

// Pre-save middleware to set display name if not provided
roleSchema.pre('save', function(next) {
  if (!this.display_name) {
    this.display_name = this.name.charAt(0).toUpperCase() + this.name.slice(1);
  }
  next();
});

// Static method to get role by name
roleSchema.statics.findByName = function(name) {
  return this.findOne({ name: name.toLowerCase() });
};

// Static method to get active roles
roleSchema.statics.findActiveRoles = function() {
  return this.find({ is_active: true });
};

// Method to check if role has permission
roleSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission);
};

module.exports = mongoose.model('Role', roleSchema);

