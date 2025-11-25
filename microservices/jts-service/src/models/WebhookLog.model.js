const mongoose = require('mongoose');
const { Schema } = mongoose;

const WebhookLogSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
    webhook_url: { type: String, required: true },
    event_type: { type: String, required: true },
    payload: Schema.Types.Mixed,
    response_status: Number,
    response_body: String,
    retries: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED'],
      default: 'PENDING',
      index: true
    },
    error_message: String,
    created_at: { type: Date, default: Date.now },
    processed_at: Date
  },
  { timestamps: false }
);

WebhookLogSchema.index({ tenant_id: 1, status: 1, created_at: 1 });

module.exports = mongoose.model('WebhookLog', WebhookLogSchema);

