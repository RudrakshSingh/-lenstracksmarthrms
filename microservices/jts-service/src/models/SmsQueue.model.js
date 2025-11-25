const mongoose = require('mongoose');
const { Schema } = mongoose;

const SmsQueueSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
    to_phone: { type: String, required: true },
    message: { type: String, required: true },
    template_code: String,
    retries: { type: Number, default: 0 },
    max_retries: { type: Number, default: 5 },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED'],
      default: 'PENDING',
      index: true
    },
    last_error: String,
    created_at: { type: Date, default: Date.now },
    sent_at: Date
  },
  { timestamps: false }
);

SmsQueueSchema.index({ tenant_id: 1, status: 1, created_at: 1 });

module.exports = mongoose.model('SmsQueue', SmsQueueSchema);

