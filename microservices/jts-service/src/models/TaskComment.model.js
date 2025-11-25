const mongoose = require('mongoose');
const { Schema } = mongoose;

const TaskCommentSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    task_id: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    author_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    message: { type: String, required: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

TaskCommentSchema.index({ tenant_id: 1, task_id: 1, created_at: 1 });

module.exports = mongoose.model('TaskComment', TaskCommentSchema);

