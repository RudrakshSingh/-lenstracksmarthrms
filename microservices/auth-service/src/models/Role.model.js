const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    enum: ['superadmin', 'admin', 'hr', 'manager', 'employee', 'accountant', 'store_manager', 'sales', 'optometrist']
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
      
      // Attendance Management
      'read_attendance', 'write_attendance', 'approve_attendance',
      'create_attendance', 'update_attendance', 'delete_attendance',
      
      // Reports
      'read_reports', 'write_reports', 'export_reports',
      'create_reports', 'update_reports', 'delete_reports',
      
      // Asset Management
      'read_assets', 'write_assets', 'assign_assets',
      'create_assets', 'update_assets', 'delete_assets',
      
      // Document Management
      'read_documents', 'write_documents', 'delete_documents',
      'upload_documents', 'download_documents', 'update_documents',
      
      // Transfer Management
      'read_transfers', 'write_transfers', 'approve_transfers',
      'create_transfers', 'update_transfers', 'delete_transfers',
      
      // Store Management
      'read_stores', 'write_stores', 'create_stores', 'update_stores',
      
      // Role Management
      'read_roles', 'write_roles', 'create_roles', 'update_roles',
      
      // System Administration
      'system_admin', 'audit_logs', 'backup_restore',
      
      // Dashboard Permissions
      'view_dashboard', 'manage_dashboard', 'view_all_widgets', 'manage_widgets',
      'view_attendance_summary', 'view_employee_count', 'view_asset_summary',
      'view_transfer_requests', 'view_document_status', 'view_store_performance',
      'view_attendance_chart', 'view_employee_chart', 'view_asset_chart',
      'view_transfer_chart', 'view_document_chart', 'view_store_chart',
      'view_recent_activities', 'view_pending_approvals', 'view_system_alerts',
      'view_attendance_trends', 'view_employee_trends', 'view_asset_trends',
      'view_compliance_status', 'view_audit_logs', 'view_system_metrics'
    ]
  }],
  is_active: {
    type: Boolean,
    default: true
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

// Indexes are already defined in the schema with index: true

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

// Static method to get role with permissions
roleSchema.statics.findWithPermissions = function(name) {
  return this.findOne({ name: name.toLowerCase() }).select('+permissions');
};

// Static method to check if role has permission
roleSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission);
};

// Static method to add permission to role
roleSchema.methods.addPermission = function(permission) {
  if (!this.permissions.includes(permission)) {
    this.permissions.push(permission);
  }
  return this.save();
};

// Static method to remove permission from role
roleSchema.methods.removePermission = function(permission) {
  this.permissions = this.permissions.filter(p => p !== permission);
  return this.save();
};

// Static method to get default permissions for role
roleSchema.statics.getDefaultPermissions = function(roleName) {
  const defaultPermissions = {
    superadmin: [
      // ALL PERMISSIONS - SuperAdmin has everything
      'read_users', 'write_users', 'delete_users', 'create_users', 'update_users', 'activate_users', 'deactivate_users',
      'read_attendance', 'write_attendance', 'approve_attendance', 'create_attendance', 'update_attendance', 'delete_attendance',
      'read_reports', 'write_reports', 'export_reports', 'create_reports', 'update_reports', 'delete_reports',
      'read_assets', 'write_assets', 'assign_assets', 'create_assets', 'update_assets', 'delete_assets',
      'read_documents', 'write_documents', 'delete_documents', 'upload_documents', 'download_documents', 'update_documents',
      'read_transfers', 'write_transfers', 'approve_transfers', 'create_transfers', 'update_transfers', 'delete_transfers',
      'read_stores', 'write_stores', 'create_stores', 'update_stores',
      'read_roles', 'write_roles', 'create_roles', 'update_roles',
      'system_admin', 'audit_logs', 'backup_restore',
      // Dashboard Permissions - ALL
      'view_dashboard', 'manage_dashboard', 'view_all_widgets', 'manage_widgets',
      'view_attendance_summary', 'view_employee_count', 'view_asset_summary',
      'view_transfer_requests', 'view_document_status', 'view_store_performance',
      'view_attendance_chart', 'view_employee_chart', 'view_asset_chart',
      'view_transfer_chart', 'view_document_chart', 'view_store_chart',
      'view_recent_activities', 'view_pending_approvals', 'view_system_alerts',
      'view_attendance_trends', 'view_employee_trends', 'view_asset_trends',
      'view_compliance_status', 'view_audit_logs', 'view_system_metrics'
    ],
    admin: [
      // ALL PERMISSIONS - Admin has everything except some SuperAdmin only features
      'read_users', 'write_users', 'delete_users', 'create_users', 'update_users', 'activate_users', 'deactivate_users',
      'read_attendance', 'write_attendance', 'approve_attendance', 'create_attendance', 'update_attendance', 'delete_attendance',
      'read_reports', 'write_reports', 'export_reports', 'create_reports', 'update_reports', 'delete_reports',
      'read_assets', 'write_assets', 'assign_assets', 'create_assets', 'update_assets', 'delete_assets',
      'read_documents', 'write_documents', 'delete_documents', 'upload_documents', 'download_documents', 'update_documents',
      'read_transfers', 'write_transfers', 'approve_transfers', 'create_transfers', 'update_transfers', 'delete_transfers',
      'read_stores', 'write_stores', 'create_stores', 'update_stores',
      'read_roles', 'write_roles', 'create_roles', 'update_roles',
      'system_admin', 'audit_logs', 'backup_restore',
      // Dashboard Permissions - ALL
      'view_dashboard', 'manage_dashboard', 'view_all_widgets', 'manage_widgets',
      'view_attendance_summary', 'view_employee_count', 'view_asset_summary',
      'view_transfer_requests', 'view_document_status', 'view_store_performance',
      'view_attendance_chart', 'view_employee_chart', 'view_asset_chart',
      'view_transfer_chart', 'view_document_chart', 'view_store_chart',
      'view_recent_activities', 'view_pending_approvals', 'view_system_alerts',
      'view_attendance_trends', 'view_employee_trends', 'view_asset_trends',
      'view_compliance_status', 'view_audit_logs', 'view_system_metrics'
    ],
    hr: [
      'read_users', 'write_users', 'create_users', 'update_users', 'activate_users', 'deactivate_users',
      'read_attendance', 'write_attendance', 'approve_attendance', 'create_attendance',
      'read_reports', 'write_reports', 'export_reports', 'create_reports',
      'read_assets', 'write_assets', 'assign_assets', 'create_assets', 'update_assets',
      'read_documents', 'write_documents', 'upload_documents', 'download_documents',
      'read_transfers', 'write_transfers', 'approve_transfers', 'create_transfers',
      'read_stores', 'write_stores', 'create_stores', 'update_stores',
      'read_roles', 'write_roles', 'create_roles', 'update_roles',
      // Dashboard Permissions - HR specific
      'view_dashboard', 'view_attendance_summary', 'view_employee_count', 'view_asset_summary',
      'view_transfer_requests', 'view_document_status', 'view_store_performance',
      'view_attendance_chart', 'view_employee_chart', 'view_asset_chart',
      'view_transfer_chart', 'view_document_chart', 'view_store_chart',
      'view_recent_activities', 'view_pending_approvals', 'view_attendance_trends', 'view_employee_trends'
    ],
    manager: [
      'read_users', 'write_users', 'create_users', 'update_users',
      'read_attendance', 'write_attendance', 'approve_attendance', 'create_attendance',
      'read_reports', 'write_reports', 'export_reports',
      'read_assets', 'write_assets', 'assign_assets', 'create_assets', 'update_assets',
      'read_documents', 'write_documents', 'upload_documents', 'download_documents',
      'read_transfers', 'write_transfers', 'approve_transfers', 'create_transfers',
      'read_stores', 'write_stores',
      // Dashboard Permissions - Manager specific
      'view_dashboard', 'view_attendance_summary', 'view_employee_count', 'view_asset_summary',
      'view_transfer_requests', 'view_attendance_chart', 'view_employee_chart', 'view_asset_chart',
      'view_transfer_chart', 'view_recent_activities', 'view_pending_approvals'
    ],
    employee: [
      'read_users', 'read_attendance', 'write_attendance', 'create_attendance',
      'read_reports', 'read_assets', 'read_documents', 'upload_documents', 'download_documents',
      'read_transfers', 'write_transfers', 'create_transfers', 'read_stores',
      // Dashboard Permissions - Employee specific
      'view_dashboard', 'view_attendance_summary', 'view_asset_summary', 'view_document_status',
      'view_attendance_chart', 'view_asset_chart', 'view_document_chart'
    ]
  };

  return defaultPermissions[roleName] || [];
};

// Static method to create default roles
roleSchema.statics.createDefaultRoles = async function() {
  const roles = [
    {
      name: 'superadmin',
      display_name: 'Super Administrator',
      description: 'Highest level access with all system permissions',
      permissions: this.getDefaultPermissions('superadmin')
    },
    {
      name: 'admin',
      display_name: 'Administrator',
      description: 'Full system access with all permissions',
      permissions: this.getDefaultPermissions('admin')
    },
    {
      name: 'hr',
      display_name: 'Human Resources',
      description: 'HR management with user and attendance oversight',
      permissions: this.getDefaultPermissions('hr')
    },
    {
      name: 'manager',
      display_name: 'Manager',
      description: 'Team management with limited administrative access',
      permissions: this.getDefaultPermissions('manager')
    },
    {
      name: 'employee',
      display_name: 'Employee',
      description: 'Basic employee access for personal data and attendance',
      permissions: this.getDefaultPermissions('employee')
    }
  ];

  for (const roleData of roles) {
    const existingRole = await this.findOne({ name: roleData.name });
    if (!existingRole) {
      await this.create(roleData);
    }
  }
};

module.exports = mongoose.model('Role', roleSchema);