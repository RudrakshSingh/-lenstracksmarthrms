const mongoose = require('mongoose');
const { Schema } = mongoose;

const TaskAttachmentSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    task_id: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    uploader_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    file_key: { type: String, required: true }, // S3 key
    /** Signed or public URL when stored externally */
    file_url: String,
    attachment_type: { type: String, default: 'FILE' },
    is_evidence: { type: Boolean, default: false },
    file_name: { type: String, required: true },
    mime_type: { type: String, required: true },
    size_bytes: { type: Number, required: true },
    /** s3 | external — presigned flow uses s3 */
    storage_provider: { type: String, enum: ['s3', 'external'], default: 's3' }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

TaskAttachmentSchema.index({ tenant_id: 1, task_id: 1 });

module.exports = mongoose.model('TaskAttachment', TaskAttachmentSchema);

