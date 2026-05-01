const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    text:      { type: String, required: true, trim: true },
    addedBy:   { type: String, required: true },
    addedAt:   { type: Date, default: Date.now },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    tenantId:       { type: String, required: true, trim: true, lowercase: true, index: true },
    storeId:        { type: String, required: true, trim: true, index: true },
    complaintNo:    { type: String, required: true, unique: true, trim: true, uppercase: true },

    // Customer
    customerId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    customerName:   { type: String, required: true, trim: true },
    customerPhone:  { type: String, trim: true },

    // Linked order / product
    opticalOrderId: { type: String, default: null },
    productName:    { type: String, trim: true },
    purchaseDate:   { type: Date, default: null },

    // Complaint detail
    category: {
      type: String,
      enum: ['defective-product', 'wrong-power', 'frame-issue', 'coating-peel', 'fit-issue', 'service-quality', 'delivery-delay', 'other'],
      required: true,
    },
    description:    { type: String, required: true, trim: true },
    photos:         [{ type: String, trim: true }],

    // Lifecycle
    status: {
      type: String,
      enum: ['open', 'under-review', 'pending-decision', 'replacement-approved', 'replacement-rejected', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    assignedTo:     { type: String, default: null },

    // Decision
    decision:       { type: String, enum: ['replace', 'repair', 'refund', 'no-action', null], default: null },
    decisionNote:   { type: String, trim: true },
    decisionBy:     { type: String },
    decisionAt:     { type: Date },

    // Resolution
    resolvedAt:     { type: Date },
    resolvedBy:     { type: String },
    resolutionNote: { type: String, trim: true },

    // Replacement optical order (auto-created on approve)
    replacementOrderId: { type: String, default: null },

    // Activity
    comments:       { type: [commentSchema], default: [] },
    raisedBy:       { type: String, required: true },
    updatedBy:      { type: String },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

complaintSchema.index({ tenantId: 1, storeId: 1, status: 1 });
complaintSchema.index({ tenantId: 1, customerId: 1 });
complaintSchema.index({ tenantId: 1, createdAt: -1 });

const Complaint = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);
module.exports = Complaint;
