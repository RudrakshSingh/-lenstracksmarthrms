const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema(
  {
    eye:    { type: String, enum: ['right', 'left', 'both'], required: true },
    sph:    { type: Number },
    cyl:    { type: Number },
    axis:   { type: Number, min: 0, max: 180 },
    add:    { type: Number },
    pd:     { type: Number },
    bvd:    { type: Number },
    prism:  { type: String },
    dnp:    { type: Number },
    ht:     { type: Number },
    notes:  { type: String, trim: true },
  },
  { _id: false }
);

const orderLineSchema = new mongoose.Schema(
  {
    lineNo:         { type: Number, required: true },
    productType:    { type: String, enum: ['lens', 'cl', 'frame', 'accessory', 'service'], required: true },
    // Lens / CL
    lensMasterId:   { type: mongoose.Schema.Types.ObjectId, ref: 'LensMaster', default: null },
    clMasterId:     { type: mongoose.Schema.Types.ObjectId, ref: 'ContactLensMaster', default: null },
    // Generic product (frame, accessory)
    productId:      { type: String, default: null },
    productName:    { type: String, trim: true },
    hsnCode:        { type: String, trim: true },
    prescription:   prescriptionSchema,
    qty:            { type: Number, required: true, min: 1, default: 1 },
    unitPrice:      { type: Number, required: true, min: 0 },
    discountAmt:    { type: Number, default: 0, min: 0 },
    gstPercent:     { type: Number, default: 0, min: 0, max: 100 },
    gstAmt:         { type: Number, default: 0 },
    lineTotal:      { type: Number, required: true, min: 0 },
    // Stock reservation tracking
    stockStatus:    { type: String, enum: ['available', 'pending-rx', 'reserved', 'inward', 'partial'], default: 'available' },
    reservationId:  { type: String, default: null },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    amount:    { type: Number, required: true, min: 0 },
    mode:      { type: String, enum: ['cash', 'card', 'upi', 'cheque', 'wallet', 'due'], required: true },
    reference: { type: String, trim: true },
    paidAt:    { type: Date, default: Date.now },
    recordedBy:{ type: String },
  },
  { _id: true, timestamps: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status:    { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: String },
    note:      { type: String, trim: true },
  },
  { _id: false }
);

const opticalOrderSchema = new mongoose.Schema(
  {
    tenantId:      { type: String, required: true, trim: true, lowercase: true, index: true },
    storeId:       { type: String, required: true, trim: true, index: true },
    orderNo:       { type: String, required: true, trim: true, uppercase: true, unique: true },

    // Customer
    customerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    customerName:  { type: String, required: true, trim: true },
    customerPhone: { type: String, trim: true },
    customerEmail: { type: String, lowercase: true, trim: true },

    // Order lines
    items:         { type: [orderLineSchema], default: [] },

    // Pricing
    subTotal:      { type: Number, required: true, min: 0 },
    discountAmt:   { type: Number, default: 0, min: 0 },
    gstAmt:        { type: Number, default: 0 },
    totalAmt:      { type: Number, required: true, min: 0 },

    // Payment
    payments:      { type: [paymentSchema], default: [] },
    paidAmt:       { type: Number, default: 0 },
    dueAmt:        { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'refunded'],
      default: 'pending',
      index: true,
    },

    // Order lifecycle
    status: {
      type: String,
      enum: [
        'draft', 'confirmed', 'on-hold',
        'lens-inward', 'cutting', 'fitting',
        'qc', 'packing', 'dispatched',
        'store-received', 'delivered', 'cancelled',
      ],
      default: 'draft',
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },

    // Lab link
    labOrderId:    { type: mongoose.Schema.Types.ObjectId, ref: 'LabOrder', default: null },

    // Prescription (top-level for quick access)
    prescriptionId:{ type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', default: null },
    prescriptionData: {
      right: prescriptionSchema,
      left:  prescriptionSchema,
      pd:    { type: Number },
      notes: { type: String, trim: true },
    },

    // Meta
    deliveryDate:  { type: Date, default: null },
    remarks:       { type: String, trim: true },
    createdBy:     { type: String, required: true },
    updatedBy:     { type: String },
    cancelReason:  { type: String, trim: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Valid status transitions
const TRANSITIONS = {
  draft:          ['confirmed', 'cancelled'],
  confirmed:      ['on-hold', 'lens-inward', 'cancelled'],
  'on-hold':      ['confirmed', 'cancelled'],
  'lens-inward':  ['cutting'],
  cutting:        ['fitting', 'qc'],
  fitting:        ['qc'],
  qc:             ['packing', 'cutting'],
  packing:        ['dispatched'],
  dispatched:     ['store-received'],
  'store-received': ['delivered'],
  delivered:      [],
  cancelled:      [],
};

opticalOrderSchema.statics.isValidTransition = function (from, to) {
  return (TRANSITIONS[from] || []).includes(to);
};

opticalOrderSchema.statics.TRANSITIONS = TRANSITIONS;

opticalOrderSchema.index({ tenantId: 1, storeId: 1, status: 1 });
opticalOrderSchema.index({ tenantId: 1, customerId: 1 });
opticalOrderSchema.index({ tenantId: 1, orderNo: 1 }, { unique: true });
opticalOrderSchema.index({ tenantId: 1, createdAt: -1 });

const OpticalOrder = mongoose.models.OpticalOrder || mongoose.model('OpticalOrder', opticalOrderSchema);

module.exports = OpticalOrder;
