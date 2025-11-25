const mongoose = require('mongoose');
const { Schema } = mongoose;

const OrgNodeSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    type: {
      type: String,
      enum: ['GLOBAL', 'REGION', 'COUNTRY', 'CLUSTER', 'STORE', 'OFFICE', 'WAREHOUSE', 'LAB'],
      required: true
    },
    name: { type: String, required: true },
    code: { type: String, required: true },
    parent_id: { type: Schema.Types.ObjectId, ref: 'OrgNode', default: null },
    path: { type: [Schema.Types.ObjectId], default: [] } // ancestors for fast subtree queries
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

OrgNodeSchema.index({ tenant_id: 1, code: 1 }, { unique: true });
OrgNodeSchema.index({ tenant_id: 1, parent_id: 1 });
OrgNodeSchema.index({ tenant_id: 1, path: 1 }); // subtree queries

module.exports = mongoose.model('OrgNode', OrgNodeSchema);

