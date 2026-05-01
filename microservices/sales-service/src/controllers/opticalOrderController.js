const OpticalOrder = require('../models/OpticalOrder.model');
const logger = require('../config/logger');

function orderNo(tenantId) {
  const prefix = String(tenantId || 'OPT').toUpperCase().slice(0, 4);
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

// GET /api/sales/optical-orders
async function list(req, res) {
  try {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const { storeId, customerId, status, paymentStatus, dateFrom, dateTo, page = 1, limit = 20 } = req.query;

    const filter = { tenantId };
    if (storeId)        filter.storeId = storeId;
    if (customerId)     filter.customerId = customerId;
    if (status)         filter.status = status;
    if (paymentStatus)  filter.paymentStatus = paymentStatus;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   filter.createdAt.$lte = new Date(dateTo);
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      OpticalOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      OpticalOrder.countDocuments(filter),
    ]);

    res.json({ success: true, data: { orders, total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    logger.error('opticalOrder.list', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/sales/optical-orders/:id
async function get(req, res) {
  try {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const order = await OpticalOrder.findOne({ _id: req.params.id, tenantId }).lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    logger.error('opticalOrder.get', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/sales/optical-orders
async function create(req, res) {
  try {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const userId   = req.user?.id || req.user?._id || 'system';

    const {
      storeId, customerName, customerPhone, customerEmail, customerId,
      items = [], subTotal, discountAmt = 0, gstAmt = 0, totalAmt,
      prescriptionData, deliveryDate, remarks, payments = [],
    } = req.body;

    if (!storeId)       return res.status(400).json({ success: false, message: 'storeId is required' });
    if (!customerName)  return res.status(400).json({ success: false, message: 'customerName is required' });
    if (!items.length)  return res.status(400).json({ success: false, message: 'At least one item is required' });

    // Compute paid/due
    const paidAmt = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const dueAmt  = Math.max(0, totalAmt - paidAmt);
    const paymentStatus = dueAmt === 0 ? 'paid' : paidAmt > 0 ? 'partial' : 'pending';

    const order = await OpticalOrder.create({
      tenantId,
      storeId,
      orderNo: orderNo(tenantId),
      customerId: customerId || null,
      customerName,
      customerPhone,
      customerEmail,
      items,
      subTotal,
      discountAmt,
      gstAmt,
      totalAmt,
      payments,
      paidAmt,
      dueAmt,
      paymentStatus,
      prescriptionData,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      remarks,
      createdBy: String(userId),
      status: 'confirmed',
      statusHistory: [{ status: 'confirmed', changedBy: String(userId) }],
    });

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Duplicate order number', code: 'DUPLICATE' });
    logger.error('opticalOrder.create', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/sales/optical-orders/:id/status
async function updateStatus(req, res) {
  try {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const userId   = req.user?.id || 'system';
    const { status: toStatus, note } = req.body;

    const order = await OpticalOrder.findOne({ _id: req.params.id, tenantId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (!OpticalOrder.isValidTransition(order.status, toStatus)) {
      return res.status(422).json({
        success: false,
        message: `Invalid transition: ${order.status} → ${toStatus}`,
        code: 'INVALID_TRANSITION',
      });
    }

    order.status = toStatus;
    order.statusHistory.push({ status: toStatus, changedBy: String(userId), note });
    order.updatedBy = String(userId);
    await order.save();

    res.json({ success: true, data: order });
  } catch (err) {
    logger.error('opticalOrder.updateStatus', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/sales/optical-orders/:id/payment
async function addPayment(req, res) {
  try {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const userId   = req.user?.id || 'system';
    const { amount, mode, reference } = req.body;

    if (!amount || !mode) return res.status(400).json({ success: false, message: 'amount and mode are required' });

    const order = await OpticalOrder.findOne({ _id: req.params.id, tenantId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status === 'cancelled') return res.status(422).json({ success: false, message: 'Cannot add payment to a cancelled order' });

    order.payments.push({ amount, mode, reference, recordedBy: String(userId) });
    order.paidAmt = order.payments.reduce((s, p) => s + p.amount, 0);
    order.dueAmt  = Math.max(0, order.totalAmt - order.paidAmt);
    order.paymentStatus = order.dueAmt === 0 ? 'paid' : order.paidAmt > 0 ? 'partial' : 'pending';
    order.updatedBy = String(userId);
    await order.save();

    res.json({ success: true, data: order });
  } catch (err) {
    logger.error('opticalOrder.addPayment', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/sales/optical-orders/:id/cancel
async function cancel(req, res) {
  try {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const userId   = req.user?.id || 'system';
    const { reason } = req.body;

    const order = await OpticalOrder.findOne({ _id: req.params.id, tenantId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!OpticalOrder.isValidTransition(order.status, 'cancelled')) {
      return res.status(422).json({ success: false, message: `Cannot cancel order in ${order.status} status`, code: 'INVALID_TRANSITION' });
    }

    order.status = 'cancelled';
    order.cancelReason = reason || 'No reason provided';
    order.statusHistory.push({ status: 'cancelled', changedBy: String(userId), note: reason });
    order.updatedBy = String(userId);
    await order.save();

    res.json({ success: true, data: order });
  } catch (err) {
    logger.error('opticalOrder.cancel', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/sales/optical-orders/customer/:customerId
async function byCustomer(req, res) {
  try {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const orders = await OpticalOrder.find({ tenantId, customerId: req.params.customerId })
      .sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, data: orders });
  } catch (err) {
    logger.error('opticalOrder.byCustomer', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { list, get, create, updateStatus, addPayment, cancel, byCustomer };
