const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    enum: ['superadmin', 'admin', 'hr', 'manager', 'employee', 'accountant', 'finance', 'store_manager', 'sales', 'optometrist']
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
  // Validated against permission catalog in permission APIs; keep open for ERP/finance codes
  permissions: [{ type: String, trim: true }],
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

// Static method to get default permissions for role (shared narrow defaults + full catalog for admin/superadmin)
roleSchema.statics.getDefaultPermissions = function (roleName) {
  const { getDefaultRolePermissions } = require('@etelios/shared/utils/defaultRolePermissions');
  return getDefaultRolePermissions(roleName);
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
    },
    {
      name: 'accountant',
      display_name: 'Accountant',
      description: 'Accounts, payroll touchpoints, AP, and employee master alignment',
      permissions: this.getDefaultPermissions('accountant')
    },
    {
      name: 'finance',
      display_name: 'Finance',
      description: 'Finance operations; same default bundle as accountant (books + payroll finance path)',
      permissions: this.getDefaultPermissions('finance')
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