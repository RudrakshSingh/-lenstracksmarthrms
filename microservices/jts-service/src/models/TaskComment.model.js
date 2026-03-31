const mongoose = require('mongoose');
const { Schema } = mongoose;

const TaskCommentSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    task_id: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    author_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    /** Primary text (legacy). */
    message: { type: String },
    /** Blueprint alias for `message`. */
    body: { type: String },
    mentions: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    is_internal: { type: Boolean, default: false }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

TaskCommentSchema.index({ tenant_id: 1, task_id: 1, created_at: 1 });

module.exports = mongoose.model('TaskComment', TaskCommentSchema);

