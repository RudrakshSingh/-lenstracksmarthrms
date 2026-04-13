const mongoose = require('mongoose');

const posOfferSchema = new mongoose.Schema({
  offer_code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  discount_type: {
    type: String,
    enum: ['PERCENTAGE', 'FIXED_AMOUNT', 'BUY_X_GET_Y'],
    required: true
  },
  discount_value: {
    type: Number,
    required: true,
    min: 0
  },
  min_purchase_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  max_discount: {
    type: Number,
    default: 0,
    min: 0
  },
  valid_from: {
    type: Date,
    required: true
  },
  valid_to: {
    type: Date,
    required: true
  },
  is_active: {
    type: Boolean,
    default: true
  },
  applicable_stores: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  }],
  tenantId: {
    type: String,
    required: true,
    default: 'default',
    index: true
  }
}, {
  timestamps: true
});

posOfferSchema.index({ offer_code: 1, tenantId: 1 }, { unique: true });
posOfferSchema.index({ tenantId: 1, is_active: 1 });

module.exports = mongoose.model('POSOffer', posOfferSchema);
