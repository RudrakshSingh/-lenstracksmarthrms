const mongoose = require('mongoose');
const { Schema } = mongoose;

const EmployeeRoleSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    role: { type: String, required: true },
    permissions: { type: [String], default: [] }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

EmployeeRoleSchema.index({ tenant_id: 1, employee_id: 1, role: 1 }, { unique: true });

module.exports = mongoose.model('EmployeeRole', EmployeeRoleSchema);

