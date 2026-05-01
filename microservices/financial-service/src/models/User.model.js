/**
 * Lightweight User reference model for financial-service.
 * Reads from the shared 'users' collection (same MongoDB, same schema as auth-service).
 * Financial-service never writes users — this is a read-only reference.
 */
const mongoose = require('mongoose');

// Minimal schema — only the fields financial-service actually needs.
// Full schema lives in auth-service; this model must use the same collection name 'users'.
const userSchema = new mongoose.Schema(
  {
    tenantId:    { type: String, required: true, index: true, trim: true, lowercase: true },
    employee_id: { type: String, trim: true, uppercase: true },
    name:        { type: String, trim: true },
    email:       { type: String, lowercase: true, trim: true },
    role:        { type: String, default: 'employee' },
    department:  { type: String },
    band_level:  { type: String },
    storeId:     { type: String, default: null },
    isActive:    { type: Boolean, default: true },
  },
  {
    collection: 'users',   // same collection as auth-service
    timestamps: true,
    strict: false,         // allow extra fields from auth-service schema
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.index({ tenantId: 1, email: 1 });
userSchema.index({ tenantId: 1, employee_id: 1 });

// Prevent re-registration (financial-service may require this file more than once)
const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
