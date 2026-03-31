const Task = require('../models/Task.model');
const TaskTimerSession = require('../models/TaskTimerSession.model');

async function assertDependenciesSatisfied(tenantId, task) {
  const ids = task.dependency_task_ids;
  if (!ids || !ids.length) return;

  const deps = await Task.find({
    _id: { $in: ids },
    tenant_id: tenantId,
    is_deleted: { $ne: true }
  })
    .select('status')
    .lean();

  if (deps.length !== ids.length) {
    throw new Error('TASK_006_DEPENDENCIES_INCOMPLETE');
  }

  const pending = deps.filter((d) => d.status !== 'COMPLETED');
  if (pending.length) {
    throw new Error('TASK_006_DEPENDENCIES_INCOMPLETE');
  }
}

function assertChecklistIfNeeded(task, toStatus) {
  if (toStatus !== 'COMPLETED' && toStatus !== 'PENDING_REVIEW') return;
  if (!task.checklist_completion_required) return;
  const items = task.checklist_items || [];
  if (items.length === 0) return;
  if (!items.every((i) => i.done)) {
    throw new Error('TASK_007_CHECKLIST_INCOMPLETE');
  }
}

async function assertTimerProofIfNeeded(task, toStatus) {
  if (toStatus !== 'COMPLETED') return;
  if (!task.requires_timer) return;

  const agg = await TaskTimerSession.aggregate([
    {
      $match: {
        tenant_id: task.tenant_id,
        task_id: task._id,
        duration_seconds: { $gt: 0 }
      }
    },
    { $group: { _id: null, total: { $sum: '$duration_seconds' } } }
  ]);

  const total = agg[0]?.total || 0;
  if (total < 1) {
    throw new Error('TASK_008_TIMER_REQUIRED');
  }
}

module.exports = {
  assertDependenciesSatisfied,
  assertChecklistIfNeeded,
  assertTimerProofIfNeeded
};
