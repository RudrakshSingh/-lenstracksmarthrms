const mongoose = require('mongoose');
const { Schema } = mongoose;

const ShiftScheduleSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
    employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    shift_date: { type: Date, required: true },
    start_time: { type: String, required: true },
    end_time: { type: String, required: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

ShiftScheduleSchema.index(
  { tenant_id: 1, employee_id: 1, shift_date: 1 },
  { unique: true }
);

module.exports = mongoose.model('ShiftSchedule', ShiftScheduleSchema);

