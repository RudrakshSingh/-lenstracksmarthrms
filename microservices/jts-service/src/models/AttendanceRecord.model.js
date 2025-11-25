const mongoose = require('mongoose');
const { Schema } = mongoose;

const AttendanceRecordSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
    employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    org_node_id: { type: Schema.Types.ObjectId, ref: 'OrgNode', required: true, index: true },
    work_date: { type: Date, required: true },
    check_in_at: Date,
    check_out_at: Date
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

AttendanceRecordSchema.index(
  { tenant_id: 1, employee_id: 1, work_date: 1 },
  { unique: true }
);

module.exports = mongoose.model('AttendanceRecord', AttendanceRecordSchema);

