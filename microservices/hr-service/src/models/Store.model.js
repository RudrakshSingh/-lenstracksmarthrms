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
      required: false, // Optional - not all regions have states
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
      required: false, // Optional - can use 'zip' field from request
      trim: true
    },
    zip: {
      type: String,
      required: false,
      trim: true
    }
  },

  // Geographic Coordinates (optional - can be added later)
  coordinates: {
    latitude: {
      type: Number,
      required: false, // Optional - not always available during initial store creation
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: false, // Optional - not always available during initial store creation
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
      required: false, // Optional - not always available during store creation
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
    required: false, // Optional - defaults to current date if not provided
    default: Date.now
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

// Indexes (remove duplicates of field-level indexes)
storeSchema.index({ coordinates: '2dsphere' });

// Virtual for full address
storeSchema.virtual('full_address').get(function() {
  const addr = this.address;
  return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}, ${addr.country}`;
});

module.exports = mongoose.model('Store', storeSchema);

