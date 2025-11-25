const mongoose = require('mongoose');
const { Schema } = mongoose;

const NotificationSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
    recipient_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    type: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    payload: Schema.Types.Mixed,
    read: { type: Boolean, default: false, index: true },
    read_at: Date,
    created_at: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

NotificationSchema.index({ tenant_id: 1, recipient_id: 1, read: 1, created_at: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);

