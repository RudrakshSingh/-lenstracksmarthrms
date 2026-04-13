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
    description: String,
    /** Optional default checklist rows when creating tasks of this type (blueprint-style template). */
    checklist_template: [
      {
        key: { type: String, required: true },
        label: { type: String, required: true },
        order: { type: Number, default: 0 },
        required: { type: Boolean, default: false }
      }
    ],
    /** Role keys allowed to create / claim tasks of this type (empty = no extra restriction). */
    allowed_role_keys: [{ type: String }]
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

TaskTypeSchema.index({ tenant_id: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('TaskType', TaskTypeSchema);

