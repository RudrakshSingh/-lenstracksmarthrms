const LensMaster = require('../models/LensMaster.model');
const ContactLensMaster = require('../models/ContactLensMaster.model');

function tenantFromReq(req) {
  return String(
    req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default'
  )
    .trim()
    .toLowerCase();
}

async function listLensMaster(req, res, next) {
  try {
    const tenantId = tenantFromReq(req);
    const { brand, visionType, index, coating, page = 1, limit = 20 } = req.query;
    const q = { tenantId, isActive: true };
    if (brand) q.brand = String(brand).toUpperCase();
    if (visionType) q.visionType = String(visionType).toUpperCase();
    if (index != null && index !== '') q.index = Number(index);
    if (coating) q.coating = String(coating).toUpperCase();

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      LensMaster.find(q).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      LensMaster.countDocuments(q)
    ]);
    return res.json({ success: true, data: { items, total, page: Number(page), limit: Number(limit) } });
  } catch (e) {
    return next(e);
  }
}

async function getLensMaster(req, res, next) {
  try {
    const tenantId = tenantFromReq(req);
    const item = await LensMaster.findOne({ _id: req.params.id, tenantId });
    if (!item) return res.status(404).json({ success: false, message: 'Lens master not found' });
    return res.json({ success: true, data: item });
  } catch (e) {
    return next(e);
  }
}

async function createLensMaster(req, res, next) {
  try {
    const tenantId = tenantFromReq(req);
    const payload = { ...req.body, tenantId, metadata: { createdBy: req.user?._id || req.user?.id } };
    const item = await LensMaster.create(payload);
    return res.status(201).json({ success: true, message: 'Lens master created', data: item });
  } catch (e) {
    if (e && e.code === 11000) {
      return res.status(409).json({ success: false, message: 'Lens master already exists for this tenant/spec' });
    }
    return next(e);
  }
}

async function updateLensMaster(req, res, next) {
  try {
    const tenantId = tenantFromReq(req);
    const payload = { ...req.body, 'metadata.updatedBy': req.user?._id || req.user?.id };
    const item = await LensMaster.findOneAndUpdate({ _id: req.params.id, tenantId }, payload, {
      new: true,
      runValidators: true
    });
    if (!item) return res.status(404).json({ success: false, message: 'Lens master not found' });
    return res.json({ success: true, message: 'Lens master updated', data: item });
  } catch (e) {
    return next(e);
  }
}

async function deleteLensMaster(req, res, next) {
  try {
    const tenantId = tenantFromReq(req);
    const item = await LensMaster.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { isActive: false, 'metadata.updatedBy': req.user?._id || req.user?.id },
      { new: true }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Lens master not found' });
    return res.json({ success: true, message: 'Lens master deactivated' });
  } catch (e) {
    return next(e);
  }
}

async function checkLensMasterStock(req, res, next) {
  try {
    const tenantId = tenantFromReq(req);
    const { brand, index, coating, sph, cyl } = req.query;
    const q = { tenantId, isActive: true };
    if (brand) q.brand = String(brand).toUpperCase();
    if (index != null && index !== '') q.index = Number(index);
    if (coating) q.coating = String(coating).toUpperCase();
    if (sph != null && sph !== '') q['powerRange.min'] = { $lte: Number(sph) };
    if (sph != null && sph !== '') q['powerRange.max'] = { $gte: Number(sph) };
    if (cyl != null && cyl !== '') q['cylRange.min'] = { $lte: Number(cyl) };
    if (cyl != null && cyl !== '') q['cylRange.max'] = { $gte: Number(cyl) };
    const match = await LensMaster.findOne(q).select('brand productType visionType index coating powerRange cylRange');
    return res.json({ success: true, data: { available: !!match, match } });
  } catch (e) {
    return next(e);
  }
}

async function listContactLensMaster(req, res, next) {
  try {
    const tenantId = tenantFromReq(req);
    const { brand, modality, power, page = 1, limit = 20 } = req.query;
    const q = { tenantId, isActive: true };
    if (brand) q.brand = String(brand).toUpperCase();
    if (modality) q.modality = String(modality).toUpperCase();
    if (power != null && power !== '') q.power = Number(power);
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      ContactLensMaster.find(q).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      ContactLensMaster.countDocuments(q)
    ]);
    return res.json({ success: true, data: { items, total, page: Number(page), limit: Number(limit) } });
  } catch (e) {
    return next(e);
  }
}

async function getContactLensMaster(req, res, next) {
  try {
    const tenantId = tenantFromReq(req);
    const item = await ContactLensMaster.findOne({ _id: req.params.id, tenantId });
    if (!item) return res.status(404).json({ success: false, message: 'Contact lens master not found' });
    return res.json({ success: true, data: item });
  } catch (e) {
    return next(e);
  }
}

async function createContactLensMaster(req, res, next) {
  try {
    const tenantId = tenantFromReq(req);
    const payload = { ...req.body, tenantId, metadata: { createdBy: req.user?._id || req.user?.id } };
    const item = await ContactLensMaster.create(payload);
    return res.status(201).json({ success: true, message: 'Contact lens master created', data: item });
  } catch (e) {
    if (e && e.code === 11000) {
      return res.status(409).json({ success: false, message: 'Contact lens master already exists for this tenant/spec' });
    }
    return next(e);
  }
}

async function updateContactLensMaster(req, res, next) {
  try {
    const tenantId = tenantFromReq(req);
    const payload = { ...req.body, 'metadata.updatedBy': req.user?._id || req.user?.id };
    const item = await ContactLensMaster.findOneAndUpdate({ _id: req.params.id, tenantId }, payload, {
      new: true,
      runValidators: true
    });
    if (!item) return res.status(404).json({ success: false, message: 'Contact lens master not found' });
    return res.json({ success: true, message: 'Contact lens master updated', data: item });
  } catch (e) {
    return next(e);
  }
}

async function deleteContactLensMaster(req, res, next) {
  try {
    const tenantId = tenantFromReq(req);
    const item = await ContactLensMaster.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { isActive: false, 'metadata.updatedBy': req.user?._id || req.user?.id },
      { new: true }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Contact lens master not found' });
    return res.json({ success: true, message: 'Contact lens master deactivated' });
  } catch (e) {
    return next(e);
  }
}

async function checkContactLensMasterStock(req, res, next) {
  try {
    const tenantId = tenantFromReq(req);
    const { brand, power, cyl, axis, baseCurve, diameter, modality } = req.query;
    const q = { tenantId, isActive: true };
    if (brand) q.brand = String(brand).toUpperCase();
    if (modality) q.modality = String(modality).toUpperCase();
    if (power != null && power !== '') q.power = Number(power);
    if (cyl != null && cyl !== '') q.cyl = Number(cyl);
    if (axis != null && axis !== '') q.axis = Number(axis);
    if (baseCurve != null && baseCurve !== '') q.baseCurve = Number(baseCurve);
    if (diameter != null && diameter !== '') q.diameter = Number(diameter);
    const match = await ContactLensMaster.findOne(q).select('brand power cyl axis baseCurve diameter modality packSize');
    return res.json({ success: true, data: { available: !!match, match } });
  } catch (e) {
    return next(e);
  }
}

module.exports = {
  listLensMaster,
  getLensMaster,
  createLensMaster,
  updateLensMaster,
  deleteLensMaster,
  checkLensMasterStock,
  listContactLensMaster,
  getContactLensMaster,
  createContactLensMaster,
  updateContactLensMaster,
  deleteContactLensMaster,
  checkContactLensMasterStock
};
