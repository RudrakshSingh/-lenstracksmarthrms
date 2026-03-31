const TaskType = require('../models/TaskType.model');
const OrgNode = require('../models/OrgNode.model');

/**
 * When HRMS MFE omits type_id / scope_org_node_id, pick tenant defaults.
 */
class CatalogDefaultsService {
  async defaultTaskTypeId(tenantId) {
    const tt = await TaskType.findOne({ tenant_id: tenantId }).sort({ created_at: 1, _id: 1 });
    if (!tt) throw new Error('TASK_TYPE_001_NOT_FOUND');
    return tt._id;
  }

  async defaultOrgNodeId(tenantId) {
    const org = await OrgNode.findOne({ tenant_id: tenantId }).sort({ created_at: 1, _id: 1 });
    if (!org) throw new Error('ORG_NODE_001_NOT_FOUND');
    return org._id;
  }

  async applyTaskDefaults(tenantId, dto) {
    const out = { ...dto };
    if (!out.type_id) {
      out.type_id = await this.defaultTaskTypeId(tenantId);
    }
    if (!out.scope_org_node_id) {
      out.scope_org_node_id = await this.defaultOrgNodeId(tenantId);
    }
    return out;
  }
}

module.exports = new CatalogDefaultsService();
