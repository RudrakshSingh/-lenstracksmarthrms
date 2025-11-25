const mongoose = require('mongoose');
const { Schema } = mongoose;

const EmployeeSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    org_node_id: { type: Schema.Types.ObjectId, ref: 'OrgNode', required: true, index: true },
    code: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    role_key: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'ON_LEAVE'],
      default: 'ACTIVE',
      index: true
    },
    joined_at: Date,
    left_at: Date
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

EmployeeSchema.index({ tenant_id: 1, email: 1 }, { unique: true });
EmployeeSchema.index({ tenant_id: 1, code: 1 }, { unique: true });
EmployeeSchema.index({ tenant_id: 1, org_node_id: 1, status: 1 });

module.exports = mongoose.model('Employee', EmployeeSchema);

