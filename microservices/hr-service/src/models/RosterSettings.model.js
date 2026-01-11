const mongoose = require('mongoose');

/**
 * Roster Settings Schema - Store-specific roster configuration
 */
const rosterSettingsSchema = new mongoose.Schema({
  // Tenant for multi-tenancy
  tenantId: {
    type: String,
    default: 'default',
    required: true,
    index: true
  },

  // Store Information
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    unique: true,
    index: true
  },
  storeId: {
    type: String,
    required: true,
    trim: true
  },
  storeName: {
    type: String,
    required: true,
    trim: true
  },

  // Staffing Requirements
  minimumRequired: {
    type: Number,
    required: true,
    default: 5,
    min: 1
  },
  maximumAllowed: {
    type: Number,
    required: true,
    default: 10,
    min: 1
  },
  optimalStaff: {
    type: Number,
    required: true,
    default: 7,
    min: 1
  },

  // Shift Configurations
  shifts: {
    MORNING: {
      start: {
        type: String,
        default: '09:00',
        required: true,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time']
      },
      end: {
        type: String,
        default: '18:00',
        required: true,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time']
      },
      duration: {
        type: Number,
        default: 9.0
      },
      breakDuration: {
        type: Number,
        default: 30
      },
      overtimeMultiplier: {
        type: Number,
        default: 1.5
      }
    },
    EVENING: {
      start: {
        type: String,
        default: '14:00',
        required: true
      },
      end: {
        type: String,
        default: '22:00',
        required: true
      },
      duration: {
        type: Number,
        default: 8.0
      },
      breakDuration: {
        type: Number,
        default: 30
      },
      overtimeMultiplier: {
        type: Number,
        default: 1.5
      }
    },
    NIGHT: {
      start: {
        type: String,
        default: '22:00',
        required: true
      },
      end: {
        type: String,
        default: '06:00',
        required: true
      },
      duration: {
        type: Number,
        default: 8.0
      },
      breakDuration: {
        type: Number,
        default: 30
      },
      overtimeMultiplier: {
        type: Number,
        default: 2.0
      }
    },
    FULL_DAY: {
      start: {
        type: String,
        default: '09:00',
        required: true
      },
      end: {
        type: String,
        default: '22:00',
        required: true
      },
      duration: {
        type: Number,
        default: 13.0
      },
      breakDuration: {
        type: Number,
        default: 60
      },
      overtimeMultiplier: {
        type: Number,
        default: 1.5
      }
    }
  },

  // Rules and Constraints
  rules: {
    maxConsecutiveDays: {
      type: Number,
      default: 6,
      min: 1,
      max: 7
    },
    minRestDays: {
      type: Number,
      default: 1,
      min: 0,
      max: 3
    },
    maxHoursPerWeek: {
      type: Number,
      default: 48,
      min: 0,
      max: 72
    },
    overtimeAllowed: {
      type: Boolean,
      default: true
    },
    nightShiftAllowed: {
      type: Boolean,
      default: true
    },
    weekendShiftAllowed: {
      type: Boolean,
      default: true
    }
  },

  // Active status
  isActive: {
    type: Boolean,
    default: true
  },

  // Creation and Update Information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'roster_settings'
});

// Indexes
rosterSettingsSchema.index({ tenantId: 1, store: 1 }, { unique: true });
rosterSettingsSchema.index({ storeId: 1 });

// Pre-save middleware to update timestamps
rosterSettingsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get or create default settings for a store
rosterSettingsSchema.statics.getOrCreateDefault = async function(storeId, storeName, createdBy) {
  let settings = await this.findOne({ storeId });
  
  if (!settings) {
    settings = new this({
      storeId,
      storeName,
      store: storeId,
      createdBy
    });
    await settings.save();
  }
  
  return settings;
};

// Export model
const RosterSettings = mongoose.model('RosterSettings', rosterSettingsSchema);

module.exports = RosterSettings;

