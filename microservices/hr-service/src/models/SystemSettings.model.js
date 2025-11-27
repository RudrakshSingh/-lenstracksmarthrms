const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    default: 'string'
  },
  category: {
    type: String,
    enum: ['general', 'email', 'sms', 'notification', 'security', 'integration', 'feature', 'other'],
    default: 'general',
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
systemSettingsSchema.index({ key: 1 });
systemSettingsSchema.index({ category: 1 });
systemSettingsSchema.index({ isPublic: 1 });

// Static method to get setting by key
systemSettingsSchema.statics.getSetting = async function(key, defaultValue = null) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : defaultValue;
};

// Static method to set setting
systemSettingsSchema.statics.setSetting = async function(key, value, type = 'string', updatedBy = null) {
  return this.findOneAndUpdate(
    { key },
    { 
      key, 
      value, 
      type,
      updated_by: updatedBy
    },
    { upsert: true, new: true }
  );
};

// Static method to get settings by category
systemSettingsSchema.statics.getSettingsByCategory = async function(category) {
  return this.find({ category });
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);

