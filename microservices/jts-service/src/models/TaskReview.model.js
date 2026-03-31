const mongoose = require('mongoose');
const { Schema } = mongoose;

const TaskReviewSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    task_id: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    reviewer_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    rating: { type: Number, min: 1, max: 5 },
    checklist_score: { type: Number, min: 0, max: 100 },
    remarks: String,
    status: {
      type: String,
      enum: ['APPROVED', 'REWORK_REQUIRED'],
      required: true,
      index: true
    },
    reviewed_at: { type: Date, required: true, default: Date.now }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

TaskReviewSchema.index({ tenant_id: 1, task_id: 1, reviewed_at: -1 });

module.exports = mongoose.model('TaskReview', TaskReviewSchema);
