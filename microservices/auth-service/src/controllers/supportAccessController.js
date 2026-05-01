const User = require('../models/User.model');
const SupportAccessGrant = require('../models/SupportAccessGrant.model');

function normalizeTenant(req) {
  return String(req.body?.tenantId || req.query?.tenantId || req.get('X-Tenant-Id') || req.user?.tenantId || '')
    .trim()
    .toLowerCase();
}

async function createGrant(req, res, next) {
  try {
    const tenantId = normalizeTenant(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'tenantId is required' });
    }

    const { grantedTo, grantedToEmail, scope = ['general'], expiresAt, requireExtraApproval = false } = req.body || {};
    if (!expiresAt) {
      return res.status(400).json({ success: false, message: 'expiresAt is required' });
    }

    let target = null;
    if (grantedTo) target = await User.findById(grantedTo).select('_id role email');
    if (!target && grantedToEmail) target = await User.findOne({ email: String(grantedToEmail).toLowerCase().trim() }).select('_id role email');
    if (!target) return res.status(404).json({ success: false, message: 'Target super admin not found' });
    if (String(target.role).toLowerCase() !== 'superadmin') {
      return res.status(400).json({ success: false, message: 'Grant target must be superadmin role' });
    }

    const exp = new Date(expiresAt);
    if (Number.isNaN(exp.getTime()) || exp <= new Date()) {
      return res.status(400).json({ success: false, message: 'expiresAt must be a future datetime' });
    }

    const grant = await SupportAccessGrant.create({
      tenantId,
      grantedBy: req.user?._id || req.user?.id,
      grantedTo: target._id,
      scope,
      requireExtraApproval: !!requireExtraApproval,
      expiresAt: exp
    });

    return res.status(201).json({ success: true, message: 'Support access grant created', data: grant });
  } catch (e) {
    return next(e);
  }
}

async function listGrants(req, res, next) {
  try {
    const tenantId = normalizeTenant(req);
    const q = { revokedAt: null };
    if (tenantId) q.tenantId = tenantId;
    const grants = await SupportAccessGrant.find(q)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('grantedBy', 'email role')
      .populate('grantedTo', 'email role');
    return res.json({ success: true, data: grants });
  } catch (e) {
    return next(e);
  }
}

async function revokeGrant(req, res, next) {
  try {
    const { id } = req.params;
    const doc = await SupportAccessGrant.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Grant not found' });
    if (doc.revokedAt) return res.status(400).json({ success: false, message: 'Grant already revoked' });

    doc.revokedAt = new Date();
    doc.revokedBy = req.user?._id || req.user?.id;
    await doc.save();

    return res.json({ success: true, message: 'Support access grant revoked', data: doc });
  } catch (e) {
    return next(e);
  }
}

module.exports = {
  createGrant,
  listGrants,
  revokeGrant
};
