const mongoose = require('mongoose');
const { Schema } = mongoose;

const TaskApprovalSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    task_id: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    requested_by_employee_id: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true
    },
    approver_employee_id: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      required: true,
      default: 'PENDING',
      index: true
    },
    reason: String,
    decided_at: Date
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

TaskApprovalSchema.index({ tenant_id: 1, approver_employee_id: 1, status: 1 });

module.exports = mongoose.model('TaskApproval', TaskApprovalSchema);

