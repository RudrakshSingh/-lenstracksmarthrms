const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    employee_id: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    department: { type: String },
    status: { type: String, default: 'active' },
    is_active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
  {
    email: { type: String },
    name: { type: String },
    role: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);

