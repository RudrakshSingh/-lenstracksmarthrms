const mongoose = require('mongoose');
const { Schema } = mongoose;

const ReviewAcknowledgmentSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
    review_id: { type: Schema.Types.ObjectId, ref: 'PerformanceReview', required: true, index: true },
    employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    acknowledged_at: { type: Date, default: Date.now },
    comments: String
  },
  { timestamps: false }
);

module.exports = mongoose.model('ReviewAcknowledgment', ReviewAcknowledgmentSchema);

