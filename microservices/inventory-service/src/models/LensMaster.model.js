const mongoose = require('mongoose');

const rangeSchema = new mongoose.Schema(
  {
    min: { type: Number },
    max: { type: Number },
    step: { type: Number, default: 0.25 }
  },
  { _id: false }
);

const vendorMapSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId },
    vendorSku: { type: String, trim: true },
    costPrice: { type: Number, min: 0, default: 0 }
  },
  { _id: false }
);

const lensMasterSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, trim: true, lowercase: true, index: true },
    brand: { type: String, required: true, trim: true, uppercase: true },
    productType: { type: String, required: true, trim: true, uppercase: true },
    visionType: { type: String, required: true, trim: true, uppercase: true },
    index: { type: Number, required: true, min: 1 },
    coating: [{ type: String, trim: true, uppercase: true }],
    powerRange: rangeSchema,
    cylRange: rangeSchema,
    axisRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 180 }
    },
    addRange: rangeSchema,
    gstPercent: { type: Number, min: 0, max: 100, default: 0 },
    hsnCode: { type: String, trim: true, uppercase: true },
    vendorMapping: [vendorMapSchema],
    isActive: { type: Boolean, default: true },
    metadata: {
      createdBy: { type: mongoose.Schema.Types.ObjectId },
      updatedBy: { type: mongoose.Schema.Types.ObjectId }
    }
  },
  { timestamps: true }
);

lensMasterSchema.index(
  { tenantId: 1, brand: 1, productType: 1, visionType: 1, index: 1, hsnCode: 1 },
  { unique: true }
);

module.exports = mongoose.model('LensMaster', lensMasterSchema);
