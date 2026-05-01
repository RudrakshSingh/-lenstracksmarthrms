const mongoose = require('mongoose');

const vendorMapSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId },
    costPrice: { type: Number, min: 0, default: 0 },
    expiryMonths: { type: Number, min: 0, default: 0 }
  },
  { _id: false }
);

const contactLensMasterSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, trim: true, lowercase: true, index: true },
    brand: { type: String, required: true, trim: true, uppercase: true },
    power: { type: Number, required: true },
    cyl: { type: Number, default: 0 },
    axis: { type: Number, min: 0, max: 180 },
    baseCurve: { type: Number, required: true },
    diameter: { type: Number, required: true },
    modality: {
      type: String,
      required: true,
      enum: ['DAILY', 'FORTNIGHTLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']
    },
    packSize: { type: Number, min: 1, default: 1 },
    gstPercent: { type: Number, min: 0, max: 100, default: 0 },
    hsnCode: { type: String, trim: true, uppercase: true },
    vendorMapping: [vendorMapSchema],
    batchTracking: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    metadata: {
      createdBy: { type: mongoose.Schema.Types.ObjectId },
      updatedBy: { type: mongoose.Schema.Types.ObjectId }
    }
  },
  { timestamps: true }
);

contactLensMasterSchema.index(
  { tenantId: 1, brand: 1, power: 1, cyl: 1, axis: 1, baseCurve: 1, diameter: 1, modality: 1 },
  { unique: true }
);

module.exports = mongoose.model('ContactLensMaster', contactLensMasterSchema);
