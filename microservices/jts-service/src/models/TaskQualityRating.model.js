const mongoose = require('mongoose');
const { Schema } = mongoose;

const TaskQualityRatingSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    task_id: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    rater_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    quality_score: { type: Number, min: 1, max: 5, required: true },
    timeliness_score: { type: Number, min: 1, max: 5, required: true },
    thoroughness_score: { type: Number, min: 1, max: 5, required: true },
    comments: String
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

TaskQualityRatingSchema.index({ tenant_id: 1, task_id: 1, rater_id: 1 }, { unique: true });

module.exports = mongoose.model('TaskQualityRating', TaskQualityRatingSchema);

