const mongoose = require('mongoose');
const { Schema } = mongoose;

const ReportingRelationshipSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    manager_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    reportee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

ReportingRelationshipSchema.index(
  { tenant_id: 1, manager_id: 1, reportee_id: 1 },
  { unique: true }
);

module.exports = mongoose.model('ReportingRelationship', ReportingRelationshipSchema);

