const mongoose = require('mongoose');

const labJobSchema = new mongoose.Schema({
  job_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  invoice_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'POSInvoice',
    required: true,
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
  prescription_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription'
  },
  job_type: {
    type: String,
    enum: ['FRAME', 'LENS', 'CONTACT_LENS', 'SUNGLASSES', 'REPAIR', 'OTHER'],
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING'
  },
  estimated_completion: {
    type: Date
  },
  actual_completion: {
    type: Date
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

labJobSchema.index({ invoice_id: 1 });
labJobSchema.index({ store_id: 1, status: 1 });
labJobSchema.index({ tenantId: 1, job_number: 1 }, { unique: true });

module.exports = mongoose.model('LabJob', labJobSchema);
