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
      
      // HR Management
      'read_hr', 'write_hr', 'create_hr', 'update_hr', 'delete_hr',
      
      // Leave Management
      'read_leave', 'write_leave', 'create_leave', 'update_leave', 'approve_leave',
      
      // Payroll Management
      'read_payroll', 'write_payroll', 'create_payroll', 'update_payroll', 'process_payroll',
      
      // Store Management
      'read_stores', 'write_stores', 'create_stores', 'update_stores', 'delete_stores',
      
      // Role Management
      'read_roles', 'write_roles', 'create_roles', 'update_roles',
      
      // Reports
      'read_reports', 'write_reports', 'export_reports',
      
      // Audit
      'read_audit', 'view_audit_logs'
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

