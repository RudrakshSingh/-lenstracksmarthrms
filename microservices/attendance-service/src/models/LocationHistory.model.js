const mongoose = require('mongoose');

const locationHistorySchema = new mongoose.Schema({
  history_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  },
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Location Data
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number },
    altitude: { type: Number },
    heading: { type: Number },
    speed: { type: Number }
  },
  
  // Network Location
  network_location: {
    latitude: { type: Number },
    longitude: { type: Number },
    accuracy: { type: Number },
    source: { type: String }
  },
  
  // IP Location
  ip_location: {
    latitude: { type: Number },
    longitude: { type: Number },
    city: { type: String },
    region: { type: String },
    country: { type: String },
    ip: { type: String }
  },
  
  // Satellite Info
  satellite_info: {
    satellite_count: { type: Number },
    average_snr: { type: Number },
    available: { type: Boolean, default: false }
  },
  
  // Calculated Fields
  distance_from_last: {
    type: Number,
    default: 0
  },
  speed_from_last: {
    type: Number,
    default: 0
  },
  time_from_last: {
    type: Number,
    default: 0
  },
  
  // Context
  action_type: {
    type: String,
    enum: ['CLOCK_IN', 'CLOCK_OUT', 'LOCATION_UPDATE'],
    required: true,
    index: true
  },
  attendance_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance'
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at' }
});

// Indexes
locationHistorySchema.index({ employee_id: 1, timestamp: -1 });
locationHistorySchema.index({ employee_id: 1, action_type: 1, timestamp: -1 });
locationHistorySchema.index({ timestamp: -1 });

// Generate history ID
locationHistorySchema.pre('save', async function(next) {
  if (!this.history_id) {
    const count = await mongoose.model('LocationHistory').countDocuments();
    this.history_id = `LH-${String(count + 1).padStart(8, '0')}`;
  }
  next();
});

// Method to calculate distance from last location
locationHistorySchema.statics.calculateDistanceFromLast = async function(employeeId, newLocation) {
  const lastLocation = await this.findOne({
    employee_id: employeeId
  }).sort({ timestamp: -1 });
  
  if (!lastLocation) {
    return {
      distance: 0,
      speed: 0,
      timeDiff: 0
    };
  }
  
  const distance = this.calculateHaversineDistance(
    lastLocation.location.latitude,
    lastLocation.location.longitude,
    newLocation.latitude,
    newLocation.longitude
  );
  
  const timeDiff = Date.now() - lastLocation.timestamp.getTime();
  const timeInHours = timeDiff / (1000 * 60 * 60);
  const speed = timeInHours > 0 ? distance / timeInHours : 0;
  
  return {
    distance,
    speed,
    timeDiff
  };
};

// Haversine formula for distance calculation
locationHistorySchema.statics.calculateHaversineDistance = function(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = this.toRad(lat2 - lat1);
  const dLon = this.toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

locationHistorySchema.statics.toRad = function(degrees) {
  return degrees * (Math.PI / 180);
};

const LocationHistory = mongoose.model('LocationHistory', locationHistorySchema);

module.exports = LocationHistory;

