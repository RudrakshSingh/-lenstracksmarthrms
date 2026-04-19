const mongoose = require('mongoose');

const financeLogSchema = new mongoose.Schema({
  external_ref_id: {
    type: String,
    index: true
  },
  finance_record_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FinanceRecord',
    index: true
  },
  event_type: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['INFO', 'SUCCESS', 'WARN', 'ERROR'],
    default: 'INFO'
  },
  details: mongoose.Schema.Types.Mixed,
  actor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('FinanceLog', financeLogSchema);
