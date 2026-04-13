const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  prescription_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  prescription_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  doctor_name: {
    type: String,
    trim: true
  },
  right_eye: {
    sphere: String,
    cylinder: String,
    axis: String,
    add: String
  },
  left_eye: {
    sphere: String,
    cylinder: String,
    axis: String,
    add: String
  },
  pd: {
    right: String,
    left: String
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'],
    default: 'ACTIVE'
  },
  notes: {
    type: String,
    trim: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tenantId: {
    type: String,
    required: true,
    default: 'default',
    index: true
  }
}, {
  timestamps: true
});

prescriptionSchema.index({ customer_id: 1 });
prescriptionSchema.index({ store_id: 1 });
prescriptionSchema.index({ tenantId: 1, prescription_number: 1 }, { unique: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);
