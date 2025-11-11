const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    index: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: 10,
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // Location Information
  address: {
    street: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true,
      default: 'India'
    },
    zipCode: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{6}$/, 'Pincode must be 6 digits']
    }
  },

  // Geographic Coordinates
  coordinates: {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    }
  },

  // Geofencing
  geofenceRadius: {
    type: Number,
    required: true,
    default: 100, // meters
    min: 10,
    max: 1000
  },

  // Contact Information
  contact: {
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    }
  },

  // Store Management
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Store Details
  store_type: {
    type: String,
    enum: ['retail', 'warehouse', 'office', 'field', 'other'],
    default: 'retail'
  },
  operatingHours: {
    type: mongoose.Schema.Types.Mixed
  },

  // Status and Activity
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'closed'],
    default: 'active',
    index: true
  },
  is_active: {
    type: Boolean,
    default: true,
    index: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  opening_date: {
    type: Date,
    required: true
  },
  closing_date: {
    type: Date
  },

  // System Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
storeSchema.index({ code: 1 });
storeSchema.index({ name: 1 });
storeSchema.index({ status: 1 });
storeSchema.index({ isDeleted: 1 });
storeSchema.index({ coordinates: '2dsphere' });

// Virtual for full address
storeSchema.virtual('full_address').get(function() {
  const addr = this.address;
  return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}, ${addr.country}`;
});

module.exports = mongoose.model('Store', storeSchema);

