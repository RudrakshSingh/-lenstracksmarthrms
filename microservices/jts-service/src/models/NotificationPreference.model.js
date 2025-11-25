const mongoose = require('mongoose');
const { Schema } = mongoose;

const NotificationPreferenceSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
    employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    channel_in_app: { type: Boolean, default: true },
    channel_email: { type: Boolean, default: true },
    channel_sms: { type: Boolean, default: false },
    channel_push: { type: Boolean, default: false },
    quiet_hours: Schema.Types.Mixed
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

NotificationPreferenceSchema.index(
  { tenant_id: 1, employee_id: 1 },
  { unique: true }
);

module.exports = mongoose.model('NotificationPreference', NotificationPreferenceSchema);

