const mongoose = require('mongoose');
const { Schema } = mongoose;

const ReviewGoalSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
    review_id: { type: Schema.Types.ObjectId, ref: 'PerformanceReview', required: true, index: true },
    description: { type: String, required: true },
    metric_target: String,
    due_date: Date,
    created_at: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

module.exports = mongoose.model('ReviewGoal', ReviewGoalSchema);

