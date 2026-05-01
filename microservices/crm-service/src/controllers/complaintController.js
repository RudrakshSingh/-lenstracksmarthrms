const Complaint = require('../models/Complaint.model');
const logger = require('../config/logger');

function complaintNo(tenantId) {
  const prefix = String(tenantId || 'CMP').toUpperCase().slice(0, 4);
  const ts = Date.now().toString(36).toUpperCase();
  return `${prefix}-CMP-${ts}`;
}

async function list(req, res) {
  try {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const { storeId, status, customerId, category, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
    const filter = { tenantId };
    if (storeId)    filter.storeId = storeId;
    if (status)     filter.status = status;
    if (customerId) filter.customerId = customerId;
    if (category)   filter.category = category;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   filter.createdAt.$lte = new Date(dateTo);
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [complaints, total] = await Promise.all([
      Complaint.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Complaint.countDocuments(filter),
    ]);
    res.json({ success: true, data: { complaints, total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    logger.error('complaint.list', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
}

async function get(req, res) {
  try {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const complaint = await Complaint.findOne({ _id: req.params.id, tenantId }).lean();
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    res.json({ success: true, data: complaint });
  } catch (err) {
    logger.error('complaint.get', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
}

async function create(req, res) {
  try {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const userId   = req.user?.id || 'system';
    const { storeId, customerName, customerPhone, customerId, opticalOrderId, productName, purchaseDate, category, description } = req.body;
    if (!storeId)      return res.status(400).json({ success: false, message: 'storeId is required' });
    if (!customerName) return res.status(400).json({ success: false, message: 'customerName is required' });
    if (!category)     return res.status(400).json({ success: false, message: 'category is required' });
    if (!description)  return res.status(400).json({ success: false, message: 'description is required' });

    const complaint = await Complaint.create({
      tenantId, storeId,
      complaintNo: complaintNo(tenantId),
      customerId: customerId || null,
      customerName, customerPhone,
      opticalOrderId: opticalOrderId || null,
      productName, purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      category, description,
      raisedBy: String(userId),
    });
    res.status(201).json({ success: true, data: complaint });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Duplicate complaint', code: 'DUPLICATE' });
    logger.error('complaint.create', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
}

async function review(req, res) {
  try {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const userId   = req.user?.id || 'system';
    const { assignedTo, note } = req.body;
    const complaint = await Complaint.findOne({ _id: req.params.id, tenantId });
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    complaint.status     = 'under-review';
    complaint.assignedTo = assignedTo || String(userId);
    complaint.updatedBy  = String(userId);
    if (note) complaint.comments.push({ text: note, addedBy: String(userId) });
    await complaint.save();
    res.json({ success: true, data: complaint });
  } catch (err) {
    logger.error('complaint.review', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
}

async function decide(req, res) {
  try {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const userId   = req.user?.id || 'system';
    const { decision, decisionNote } = req.body;
    if (!decision) return res.status(400).json({ success: false, message: 'decision is required' });
    const complaint = await Complaint.findOne({ _id: req.params.id, tenantId });
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    complaint.decision   = decision;
    complaint.decisionNote = decisionNote;
    complaint.decisionBy = String(userId);
    complaint.decisionAt = new Date();
    complaint.status     = decision === 'replace' ? 'replacement-approved' : decision === 'no-action' ? 'replacement-rejected' : 'pending-decision';
    complaint.updatedBy  = String(userId);
    await complaint.save();
    res.json({ success: true, data: complaint });
  } catch (err) {
    logger.error('complaint.decide', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { list, get, create, review, decide };
