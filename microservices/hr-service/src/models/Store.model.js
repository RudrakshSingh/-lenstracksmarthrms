const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    trim: true,
    default: 'default',
    index: true
  },
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
    maxlength: 50,
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

  // Google Maps Integration
  googleMapsUrl: {
    type: String,
    trim: true
  },

  // Geofencing
  geofenceRadius: {
    type: Number,
    required: true,
    default: 100, // meters
    min: 10,
    max: 1000
  },

  // Contact Information (nested and flat for compatibility)
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
  // Flat fields for direct access (frontend compatibility)
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
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
storeSchema.index({ tenantId: 1, code: 1 }, { unique: true });
storeSchema.index({ tenantId: 1, name: 1 }, { unique: true }); // Prevent duplicate store names per tenant

// Virtual for storeCode (alias for code)
storeSchema.virtual('storeCode').get(function() {
  return this.code;
});

// Virtual for latitude (direct access)
storeSchema.virtual('latitude').get(function() {
  return this.coordinates?.latitude;
});

// Virtual for longitude (direct access)
storeSchema.virtual('longitude').get(function() {
  return this.coordinates?.longitude;
});

// Virtual for street (direct access)
storeSchema.virtual('street').get(function() {
  return this.address?.street;
});

// Virtual for city (direct access)
storeSchema.virtual('city').get(function() {
  return this.address?.city;
});

// Virtual for state (direct access)
storeSchema.virtual('state').get(function() {
  return this.address?.state;
});

// Virtual for pincode (direct access, handles both zipCode and zip)
storeSchema.virtual('pincode').get(function() {
  return this.address?.zipCode || this.address?.zip;
});

// Virtual for country (direct access)
storeSchema.virtual('country').get(function() {
  return this.address?.country;
});

// Virtual for full address
storeSchema.virtual('full_address').get(function() {
  const addr = this.address;
  if (!addr) return '';
  return `${addr.street}, ${addr.city}, ${addr.state || ''} ${addr.zipCode || addr.zip || ''}, ${addr.country}`.replace(/\s+/g, ' ').trim();
});

// Virtual for staffCount (will be populated dynamically)
storeSchema.virtual('staffCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'store',
  count: true
});

// Virtual for activeStaffCount (will be populated dynamically)
storeSchema.virtual('activeStaffCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'store',
  count: true,
  match: { status: 'active', isDeleted: false }
});

// Pre-save middleware to sync flat fields with nested contact
storeSchema.pre('save', function(next) {
  // Sync phone and email between nested and flat fields
  if (this.contact) {
    if (this.contact.phone && !this.phone) {
      this.phone = this.contact.phone;
    } else if (this.phone && !this.contact.phone) {
      this.contact.phone = this.phone;
    }
    
    if (this.contact.email && !this.email) {
      this.email = this.contact.email;
    } else if (this.email && !this.contact.email) {
      this.contact.email = this.email;
    }
  }
  next();
});

module.exports = mongoose.model('Store', storeSchema);

