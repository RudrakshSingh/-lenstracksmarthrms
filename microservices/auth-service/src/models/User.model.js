const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Multi-tenant support
  tenantId: {
    type: String,
    required: true,
    index: true,
    trim: true,
    lowercase: true
  },
  
  // Basic Information
  employee_id: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    // Allow modern valid emails including '+' tags (e.g. admin+foo@domain.com)
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: false,  // Made optional
    trim: true,
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },

  // Role and Permissions
  role: {
    type: String,
    required: true,
    enum: ['superadmin', 'admin', 'hr', 'manager', 'employee', 'accountant', 'store_manager', 'sales', 'optometrist'],
    default: 'employee'
  },
  
  // Hierarchical System
  department: {
    type: String,
    required: true,
    enum: ['SALES', 'TECH', 'ACCOUNTS', 'ECOMMERCE', 'FRANCHISE', 'LAB', 'DELIVERY', 'HR'],
    uppercase: true
  },
  band_level: {
    type: String,
    required: true,
    enum: ['A', 'B', 'B+', 'C', 'D', 'E', 'F'],
    default: 'F'
  },
  hierarchy_level: {
    type: String,
    required: true,
    enum: ['STORE', 'AREA', 'REGIONAL', 'ZONAL', 'NATIONAL', 'SUPPORT'],
    default: 'STORE'
  },
  
  // Extra allows on top of role defaults (validated against permission catalog in APIs)
  custom_permissions: [{
    type: String,
    trim: true
  }],
  // Explicit blocks removed from effective set even if the role grants them
  permission_denials: [{
    type: String,
    trim: true
  }],
  permissionsRevision: {
    type: Number,
    default: 0,
    min: 0
  },

  // Geofencing Settings (for Sales and Store Managers)
  geofencing_enabled: {
    type: Boolean,
    default: false
  },
  allowed_stores: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  }],
  geofencing_radius: {
    type: Number,
    default: 100 // meters
  },
  permissions: [{
    type: String,
    enum: [
      // User Management
      'read_users', 'write_users', 'delete_users',
      
      // Attendance Management
      'read_attendance', 'write_attendance', 'approve_attendance',
      
      // Reports
      'read_reports', 'write_reports',
      
      // Asset Management
      'read_assets', 'write_assets', 'assign_assets',
      
      // Document Management
      'read_documents', 'write_documents', 'delete_documents',
      
      // Transfer Management
      'read_transfers', 'write_transfers', 'approve_transfers',
      
      // Store Management
      'read_stores', 'write_stores',
      
      // Role Management
      'read_roles', 'write_roles',
      
      // ERP Permissions
      'view_aging_dashboard', 'generate_aging_report', 'view_aging_reports',
      'view_transfer_recommendations', 'create_transfer_order', 'view_transfer_orders',
      'approve_transfer_order', 'calculate_gst', 'view_hsn_details',
      'view_inventory_aging', 'view_slow_moving_items', 'view_dead_stock_items',
      
      // Financial Permissions
      'manage_pandl', 'view_pandl', 'view_pandl_summary', 'manage_expenses',
      'view_expenses', 'manage_ledger', 'view_ledger', 'view_trial_balance',
      'view_account_balance', 'manage_tds', 'view_tds', 'view_tds_summary',
      'view_financial_dashboard',
      
      // Sales Permissions
      'manage_customers', 'view_customers', 'create_sales_orders', 'view_sales_orders',
      'update_sales_orders', 'view_sales_dashboard', 'view_product_availability',
      
      // Payroll Permissions
      'write_employee_master', 'read_employee_master', 'write_payroll', 'read_payroll',
      'read_payroll_summary', 'lock_payroll', 'read_analytics',
      
      // Purchase & Vendor Management Permissions
      'manage_vendors', 'view_vendors', 'manage_purchase_orders', 'view_purchase_orders',
      'manage_grn', 'view_grn', 'manage_purchase_invoices', 'view_purchase_invoices',
      'manage_vendor_payments', 'view_vendor_payments', 'manage_purchase_returns',
      'view_purchase_returns', 'manage_reorder_rules', 'view_reorder_rules',
      'view_po_suggestions', 'generate_po_suggestions', 'view_vendor_performance',
      'view_purchase_dashboard',
      
      // Service SLA & Escalation Permissions
      'create_tickets', 'view_tickets', 'assign_tickets', 'update_ticket_status',
      'pause_tickets', 'resume_tickets', 'manage_sla', 'manage_sla_policies',
      'view_sla_policies', 'manage_escalation_matrix', 'view_escalation_matrix',
      'view_sla_reports', 'view_ticket_analytics', 'view_red_alert_dashboard',
      'send_ticket_notifications', 'view_service_dashboard',
      
      // CPP (Customer Protection Plan) Permissions
      'manage_cpp_policies', 'view_cpp_policies', 'manage_cpp_enrollments',
      'view_cpp_enrollments', 'create_cpp_claims', 'view_cpp_claims',
      'assess_cpp_claims', 'fulfill_cpp_claims', 'manage_cpp_claims',
      'view_cpp_pricing', 'check_cpp_eligibility', 'view_cpp_analytics',
      'view_cpp_dashboard',

      // Customer Engagement Permissions
      'manage_customers', 'view_customers', 'manage_appointments', 'view_appointments',
      'create_sales_orders', 'view_sales_orders', 'update_sales_orders',
      'manage_prescriptions', 'manage_contact_lens_plans', 'manage_campaigns',
      'view_campaigns', 'manage_templates', 'view_templates', 'manage_automation_rules',
      'view_automation_rules', 'create_tasks', 'view_tasks', 'update_tasks',
      'run_automation', 'send_messages', 'submit_feedback', 'view_engagement_analytics',
      'view_message_logs',
      
      // Incentive & Motivation Permissions
      'manage_incentive_rules', 'view_incentive_rules', 'record_performance',
      'view_performance', 'calculate_incentives', 'use_gamification',
      'view_gamification', 'view_leaderboards', 'view_payouts',
      'approve_payouts', 'process_payouts', 'manage_teams', 'view_teams',
      'view_incentive_analytics', 'view_incentive_dashboard'
    ]
  }],

  // Employment Details
  department: {
    type: String,
    required: true,
    trim: true
  },
  designation: {
    type: String,
    required: true,
    trim: true
  },
  joining_date: {
    type: Date,
    required: true
  },
  probation_end_date: {
    type: Date
  },
  reporting_manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Store Assignment
  stores: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  }],
  primary_store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },

  // Status and Activity
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'terminated', 'probation'],
    default: 'active'
  },
  is_active: {
    type: Boolean,
    default: true
  },
  
  // Temporary password flow (tenant creation / first login)
  // If true, frontend should force user to change password after first login.
  mustChangePassword: {
    type: Boolean,
    default: false
  },
  // If true, indicates password was system-generated / temporary.
  passwordTemporary: {
    type: Boolean,
    default: false
  },
  passwordChangedAt: {
    type: Date
  },
  last_login: {
    type: Date
  },
  last_activity: {
    type: Date,
    default: Date.now
  },

  // Personal Information
  date_of_birth: {
    type: Date
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    pincode: String
  },
  emergency_contact: {
    name: String,
    relationship: String,
    phone: String
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

// Multi-tenant indexes
userSchema.index({ tenantId: 1, employee_id: 1 }, { unique: true });
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });
userSchema.index({ tenantId: 1, role: 1 });
userSchema.index({ tenantId: 1, department: 1 });
userSchema.index({ tenantId: 1, status: 1 });
userSchema.index({ tenantId: 1, is_active: 1 });
userSchema.index({ tenantId: 1, created_at: -1 });

// Virtual for full name
userSchema.virtual('full_name').get(function() {
  return this.name;
});

// Virtual for employment duration
userSchema.virtual('employment_duration').get(function() {
  if (this.joining_date) {
    const now = new Date();
    const diffTime = Math.abs(now - this.joining_date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return 0;
});

// Pre-save middleware to hash password and generate employee ID
userSchema.pre('save', async function(next) {
  // Generate Employee ID if not provided
  if (this.isNew && !this.employee_id) {
    this.employee_id = await this.generateEmployeeId();
  }

  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update last_activity
userSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.last_activity = new Date();
  }
  next();
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to get public profile
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.__v;
  return userObject;
};

// Static method to find by employee ID (tenant-aware)
userSchema.statics.findByEmployeeId = function(tenantId, employeeId) {
  return this.findOne({ tenantId, employee_id: employeeId.toUpperCase() });
};

// Static method to find by email (tenant-aware)
userSchema.statics.findByEmail = function(tenantId, email) {
  return this.findOne({ tenantId, email: email.toLowerCase() });
};

// Instance method to generate Employee ID (tenant-aware)
userSchema.methods.generateEmployeeId = async function() {
  const deptCode = this.department.toUpperCase();
  const lastEmployee = await this.constructor.findOne(
    { tenantId: this.tenantId, department: this.department },
    {},
    { sort: { employee_id: -1 } }
  );
  
  let nextNumber = 1;
  if (lastEmployee && lastEmployee.employee_id) {
    const lastNumber = parseInt(lastEmployee.employee_id.split('-')[2]);
    nextNumber = lastNumber + 1;
  }
  
  return `ETELIOS-${deptCode}-${nextNumber.toString().padStart(3, '0')}`;
};

// Static method to get department-specific default permissions
userSchema.statics.getDepartmentPermissions = function(department) {
  const departmentPermissions = {
    SALES: [
      'view_dashboard', 'view_attendance_summary', 'view_sales_data', 'manage_sales',
      'view_customer_data', 'manage_customers', 'view_optometry_data', 'manage_optometry',
      'view_prescriptions', 'geofencing_access', 'location_tracking', 'store_geofencing',
      'read_attendance', 'write_attendance', 'create_attendance', 'read_reports'
    ],
    TECH: [
      'view_dashboard', 'view_system_metrics', 'view_audit_logs', 'system_admin',
      'read_users', 'write_users', 'create_users', 'update_users', 'read_assets',
      'write_assets', 'create_assets', 'update_assets', 'read_documents',
      'write_documents', 'upload_documents', 'download_documents'
    ],
    ACCOUNTS: [
      'view_dashboard', 'view_attendance_summary', 'view_employee_count', 'view_asset_summary',
      'read_reports', 'write_reports', 'export_reports', 'read_users', 'read_assets',
      'read_documents', 'read_transfers', 'view_financial_data', 'manage_financials'
    ],
    ECOMMERCE: [
      'view_dashboard', 'view_sales_data', 'manage_sales', 'view_customer_data',
      'manage_customers', 'read_reports', 'write_reports', 'read_assets',
      'read_documents', 'view_ecommerce_data', 'manage_ecommerce'
    ],
    FRANCHISE: [
      'view_dashboard', 'view_attendance_summary', 'view_employee_count', 'view_store_performance',
      'read_reports', 'write_reports', 'read_users', 'read_stores', 'write_stores',
      'create_stores', 'update_stores', 'view_franchise_data', 'manage_franchise'
    ],
    LAB: [
      'view_dashboard', 'view_asset_summary', 'view_document_status', 'read_assets',
      'write_assets', 'assign_assets', 'create_assets', 'update_assets', 'read_documents',
      'write_documents', 'upload_documents', 'download_documents', 'view_lab_data',
      'manage_lab', 'view_prescriptions'
    ],
    DELIVERY: [
      'view_dashboard', 'view_attendance_summary', 'read_attendance', 'write_attendance',
      'create_attendance', 'read_reports', 'view_delivery_data', 'manage_delivery',
      'location_tracking', 'geofencing_access'
    ],
    HR: [
      'view_dashboard', 'view_attendance_summary', 'view_employee_count', 'view_asset_summary',
      'view_transfer_requests', 'view_document_status', 'read_users', 'write_users',
      'create_users', 'update_users', 'activate_users', 'deactivate_users',
      'read_attendance', 'write_attendance', 'approve_attendance', 'create_attendance',
      'read_reports', 'write_reports', 'export_reports', 'create_reports',
      'read_assets', 'write_assets', 'assign_assets', 'create_assets', 'update_assets',
      'read_documents', 'write_documents', 'upload_documents', 'download_documents',
      'read_transfers', 'write_transfers', 'approve_transfers', 'create_transfers',
      'read_stores', 'write_stores', 'create_stores', 'update_stores',
      'read_roles', 'write_roles', 'create_roles', 'update_roles'
    ]
  };
  
  return departmentPermissions[department] || [];
};

// Static method to find active users (tenant-aware)
userSchema.statics.findActiveUsers = function(tenantId) {
  return this.find({ tenantId, is_active: true, status: 'active' });
};

// Static method to find users by role (tenant-aware)
userSchema.statics.findByRole = function(tenantId, role) {
  return this.find({ tenantId, role, is_active: true });
};

// Static method to find users by store (tenant-aware)
userSchema.statics.findByStore = function(tenantId, storeId) {
  return this.find({ tenantId, stores: storeId, is_active: true });
};

// Static method to find subordinates (tenant-aware)
userSchema.statics.findSubordinates = function(tenantId, managerId) {
  return this.find({ tenantId, reporting_manager: managerId, is_active: true });
};

// Static method to get user statistics (tenant-aware)
userSchema.statics.getUserStats = async function(tenantId) {
  const stats = await this.aggregate([
    { $match: { tenantId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const roleStats = await this.aggregate([
    { $match: { tenantId } },
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    statusStats: stats,
    roleStats: roleStats
  };
};

// Transform function to remove sensitive data
userSchema.set('toJSON', {
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);