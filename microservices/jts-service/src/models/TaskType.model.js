const mongoose = require('mongoose');
const { Schema } = mongoose;

const TaskTypeSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    category: String,
    default_priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true
    },
    description: String
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

TaskTypeSchema.index({ tenant_id: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('TaskType', TaskTypeSchema);

