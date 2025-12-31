const mongoose = require('mongoose');

const rosterSchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  employeeName: {
    type: String,
    required: true
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true
  },
  storeName: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  shift: {
    type: String,
    required: true,
    enum: ['MORNING', 'EVENING', 'NIGHT']
  },
  shiftStart: {
    type: String,
    required: true
  },
  shiftEnd: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['ASSIGNED', 'CONFIRMED', 'CANCELLED'],
    default: 'ASSIGNED'
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
rosterSchema.index({ employee_id: 1, date: 1 });
rosterSchema.index({ store_id: 1, date: 1 });
rosterSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('Roster', rosterSchema);

