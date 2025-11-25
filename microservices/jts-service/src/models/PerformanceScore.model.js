const mongoose = require('mongoose');
const { Schema } = mongoose;

const PerformanceScoreSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
    employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    period_type: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL'],
      required: true
    },
    period_start_date: { type: Date, required: true },
    period_end_date: { type: Date, required: true },
    completion_score: { type: Number, required: true },
    sla_score: { type: Number, required: true },
    quality_score: { type: Number, required: true },
    efficiency_score: { type: Number, required: true },
    reliability_score: { type: Number, required: true },
    total_performance_score: { type: Number, required: true },
    performance_grade: { type: String, required: true },
    performance_tier: { type: String, required: true },
    team_rank: Number,
    team_size: Number,
    sla_compliance_percentile: Number,
    calculated_at: { type: Date, required: true }
  },
  { timestamps: false }
);

PerformanceScoreSchema.index(
  { tenant_id: 1, employee_id: 1, period_type: 1, period_start_date: 1 },
  { unique: true }
);

module.exports = mongoose.model('PerformanceScore', PerformanceScoreSchema);

