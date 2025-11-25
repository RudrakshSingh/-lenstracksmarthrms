const mongoose = require('mongoose');
const { Schema } = mongoose;

const PerformanceReviewSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
    employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    reviewer_employee_id: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true
    },
    review_period_start: { type: Date, required: true },
    review_period_end: { type: Date, required: true },
    review_type: {
      type: String,
      enum: ['QUARTERLY', 'ANNUAL', 'PROBATION', 'AD_HOC'],
      required: true
    },
    avg_performance_score: Number,
    avg_sla_compliance: Number,
    total_tasks_completed: Number,
    manager_rating: { type: Number, min: 1, max: 5 },
    manager_comments: String,
    strengths: String,
    areas_for_improvement: String,
    recommended_action: String,
    training_needs: String,
    goals_next_period: String,
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'CLOSED'],
      default: 'DRAFT',
      index: true
    },
    employee_acknowledged_at: Date
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

PerformanceReviewSchema.index({ tenant_id: 1, employee_id: 1, review_period_start: 1 });

module.exports = mongoose.model('PerformanceReview', PerformanceReviewSchema);

