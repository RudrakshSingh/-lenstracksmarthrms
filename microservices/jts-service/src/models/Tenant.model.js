const mongoose = require('mongoose');
const { Schema } = mongoose;

const TenantSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    subdomain: { type: String, required: true, unique: true },
    is_active: { type: Boolean, required: true, default: true, index: true },
    settings: {
      timezone: { type: String, required: true, default: 'Asia/Kolkata' },
      working_days: { type: [Number], default: [1, 2, 3, 4, 5, 6] }, // 0-6, Monday=1
      working_hours: {
        start: { type: String, default: '10:00' },
        end: { type: String, default: '21:00' }
      },
      sla_basis_default: {
        type: String,
        enum: ['CALENDAR_TIME', 'BUSINESS_HOURS'],
        default: 'BUSINESS_HOURS'
      }
    }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('Tenant', TenantSchema);

