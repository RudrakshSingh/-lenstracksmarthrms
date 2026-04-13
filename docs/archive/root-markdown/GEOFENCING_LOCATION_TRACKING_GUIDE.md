# Geofencing - Permanent Location Tracking Guide

## Overview

Geofencing के लिए permanent location tracking कैसे implement करें और maintain करें।

---

## Current Implementation

### 1. Store Model में Location Storage

**File:** `microservices/hr-service/src/models/Store.model.js`

```javascript
// Geographic Coordinates (permanent location)
coordinates: {
  latitude: {
    type: Number,
    required: false, // Optional initially, but required for geofencing
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: false, // Optional initially, but required for geofencing
    min: -180,
    max: 180
  }
},

// Geofencing Radius
geofenceRadius: {
  type: Number,
  required: true,
  default: 100, // meters
  min: 10,
  max: 1000
},

// Google Maps Integration (optional - can extract coordinates from URL)
googleMapsUrl: {
  type: String,
  trim: true
}
```

### 2. Database Index

```javascript
// 2dsphere index for geospatial queries
storeSchema.index({ coordinates: '2dsphere' });
```

यह index geospatial queries को fast बनाता है।

---

## Location Data कैसे Set करें

### Method 1: Store Creation के समय

**API:** `POST /api/hr/stores`

```json
{
  "name": "Store Name",
  "code": "STORE-001",
  "address": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "zipCode": "400001"
  },
  "coordinates": {
    "latitude": 19.0760,
    "longitude": 72.8777
  },
  "geofenceRadius": 200,  // meters (default: 100)
  "googleMapsUrl": "https://maps.google.com/?q=19.0760,72.8777"
}
```

### Method 2: Store Update के समय

**API:** `PUT /api/hr/stores/:id`

```json
{
  "coordinates": {
    "latitude": 19.0760,
    "longitude": 72.8777
  },
  "geofenceRadius": 200
}
```

### Method 3: Google Maps URL से Auto-extract

**Service Logic:** `microservices/hr-service/src/services/hr.service.js`

```javascript
// If googleMapsUrl provided, extract coordinates
if (googleMapsUrl && (!storeData.coordinates || !storeData.coordinates.latitude)) {
  try {
    const extractedCoords = extractCoordinatesFromGoogleMapsUrl(googleMapsUrl);
    if (extractedCoords) {
      storeData.coordinates = {
        latitude: extractedCoords.latitude,
        longitude: extractedCoords.longitude
      };
    }
  } catch (error) {
    logger.warn('Failed to extract coordinates from Google Maps URL', { error });
  }
}
```

---

## Geofencing कैसे काम करता है

### 1. Clock-in के समय

**File:** `microservices/attendance-service/src/services/attendance.service.js`

```javascript
// Store coordinates fetch करें
const store = await getStoreForEmployee(employee, token);

// Extract coordinates
const storeLatitude = store.coordinates?.latitude || store.latitude;
const storeLongitude = store.coordinates?.longitude || store.longitude;

// Geofence check
if (storeLatitude && storeLongitude) {
  isWithinGeofenceArea = isWithinGeofence(
    latitude,           // Employee's current location
    longitude,
    storeLatitude,      // Store's permanent location
    storeLongitude,
    store.geofenceRadius || 200  // Radius in meters
  );
}
```

### 2. Location Tracking (Auto-logout)

**File:** `microservices/attendance-service/src/controllers/attendanceController.js`

```javascript
// Real-time location tracking
POST /api/attendance/track-location

// Employee location vs Store permanent location
const distance = calculateDistance(
  employeeLatitude,
  employeeLongitude,
  store.coordinates.latitude,  // Permanent store location
  store.coordinates.longitude,
  store.geofenceRadius || 200
);

// Auto-logout if outside geofence
if (distance > geofenceRadius) {
  // Auto clock-out
}
```

---

## Best Practices

### 1. Coordinates Set करने के लिए

#### ✅ Recommended: Google Maps से Coordinates लें

```javascript
// Frontend में
const getCoordinatesFromAddress = async (address) => {
  // Google Maps Geocoding API use करें
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`
  );
  const data = await response.json();
  return {
    latitude: data.results[0].geometry.location.lat,
    longitude: data.results[0].geometry.location.lng
  };
};
```

#### ✅ Alternative: Manual Entry

```javascript
// Store creation form में
<Form>
  <Input name="coordinates.latitude" type="number" step="0.000001" />
  <Input name="coordinates.longitude" type="number" step="0.000001" />
  <Input name="geofenceRadius" type="number" min="10" max="1000" />
</Form>
```

### 2. Geofence Radius Set करें

| Store Type | Recommended Radius |
|------------|-------------------|
| Small Store | 50-100 meters |
| Medium Store | 100-200 meters |
| Large Store/Warehouse | 200-500 meters |
| Office Building | 100-300 meters |

### 3. Coordinates Validation

```javascript
// Backend validation (already implemented)
coordinates: {
  latitude: {
    type: Number,
    min: -90,   // South Pole
    max: 90     // North Pole
  },
  longitude: {
    type: Number,
    min: -180,  // West
    max: 180    // East
  }
}
```

---

## API Endpoints

### 1. Store Create/Update

```bash
# Create Store with Location
POST /api/hr/stores
{
  "name": "Store Name",
  "code": "STORE-001",
  "coordinates": {
    "latitude": 19.0760,
    "longitude": 72.8777
  },
  "geofenceRadius": 200
}

# Update Store Location
PUT /api/hr/stores/:id
{
  "coordinates": {
    "latitude": 19.0760,
    "longitude": 72.8777
  },
  "geofenceRadius": 200
}
```

### 2. Verify Geofence

```bash
# Test if location is within geofence
POST /api/hr/stores/:id/verify-geofence
{
  "latitude": 19.0760,
  "longitude": 72.8777
}

# Response
{
  "success": true,
  "data": {
    "withinGeofence": true,
    "distance": 45.2,  // meters
    "geofenceRadius": 200,
    "storeLocation": {
      "latitude": 19.0760,
      "longitude": 72.8777
    }
  }
}
```

### 3. Get Store with Location

```bash
# Get Store Details
GET /api/hr/stores/:id

# Response includes:
{
  "coordinates": {
    "latitude": 19.0760,
    "longitude": 72.8777
  },
  "geofenceRadius": 200,
  "hasCoordinates": true
}
```

---

## Frontend Implementation

### 1. Store Creation Form

```javascript
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

const StoreForm = () => {
  const [coordinates, setCoordinates] = useState(null);
  
  // Google Maps से coordinates extract करें
  const handleAddressChange = async (address) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`
      );
      const data = await response.json();
      if (data.results.length > 0) {
        const location = data.results[0].geometry.location;
        setCoordinates({
          latitude: location.lat,
          longitude: location.lng
        });
      }
    } catch (error) {
      console.error('Failed to get coordinates', error);
    }
  };
  
  // Manual coordinates entry
  const handleCoordinatesChange = (lat, lng) => {
    setCoordinates({ latitude: lat, longitude: lng });
  };
  
  const onSubmit = async (data) => {
    await createStore({
      ...data,
      coordinates,
      geofenceRadius: data.geofenceRadius || 200
    });
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Address fields */}
      <input name="address.street" />
      <input name="address.city" />
      
      {/* Coordinates (auto-filled or manual) */}
      <input 
        type="number" 
        value={coordinates?.latitude} 
        onChange={(e) => handleCoordinatesChange(e.target.value, coordinates?.longitude)}
        placeholder="Latitude"
      />
      <input 
        type="number" 
        value={coordinates?.longitude} 
        onChange={(e) => handleCoordinatesChange(coordinates?.latitude, e.target.value)}
        placeholder="Longitude"
      />
      
      {/* Geofence Radius */}
      <input 
        type="number" 
        name="geofenceRadius" 
        min="10" 
        max="1000" 
        defaultValue={200}
      />
      
      <button type="submit">Create Store</button>
    </form>
  );
};
```

### 2. Map Integration (Optional)

```javascript
import { GoogleMap, Marker, Circle } from '@react-google-maps/api';

const StoreLocationMap = ({ store, employeeLocation }) => {
  const storeLocation = {
    lat: store.coordinates.latitude,
    lng: store.coordinates.longitude
  };
  
  return (
    <GoogleMap
      center={storeLocation}
      zoom={15}
    >
      {/* Store Location Marker */}
      <Marker position={storeLocation} label="Store" />
      
      {/* Geofence Circle */}
      <Circle
        center={storeLocation}
        radius={store.geofenceRadius}
        options={{
          fillColor: '#00FF00',
          fillOpacity: 0.2,
          strokeColor: '#00FF00',
          strokeOpacity: 0.8
        }}
      />
      
      {/* Employee Location (if available) */}
      {employeeLocation && (
        <Marker 
          position={employeeLocation} 
          label="You"
          icon={{
            url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
          }}
        />
      )}
    </GoogleMap>
  );
};
```

---

## Database Queries

### 1. Find Stores Near Location

```javascript
// MongoDB geospatial query
const stores = await Store.find({
  coordinates: {
    $near: {
      $geometry: {
        type: 'Point',
        coordinates: [longitude, latitude]  // Note: [lng, lat] order
      },
      $maxDistance: 5000  // 5km radius
    }
  }
});
```

### 2. Check if Location is Within Geofence

```javascript
// Using utility function
const { isWithinGeofence } = require('../utils/geoUtils');

const withinGeofence = isWithinGeofence(
  employeeLat,
  employeeLng,
  store.coordinates.latitude,
  store.coordinates.longitude,
  store.geofenceRadius
);
```

---

## Maintenance & Updates

### 1. Bulk Update Coordinates

```javascript
// Script to update all stores with missing coordinates
const updateStoreCoordinates = async () => {
  const stores = await Store.find({
    $or: [
      { 'coordinates.latitude': { $exists: false } },
      { 'coordinates.longitude': { $exists: false } }
    ]
  });
  
  for (const store of stores) {
    if (store.googleMapsUrl) {
      // Extract from Google Maps URL
      const coords = extractCoordinatesFromGoogleMapsUrl(store.googleMapsUrl);
      if (coords) {
        store.coordinates = coords;
        await store.save();
      }
    } else if (store.address) {
      // Geocode address
      const coords = await geocodeAddress(store.address);
      if (coords) {
        store.coordinates = coords;
        await store.save();
      }
    }
  }
};
```

### 2. Validate Coordinates

```javascript
// Check if coordinates are valid
const validateCoordinates = (lat, lng) => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
};
```

---

## Troubleshooting

### Issue 1: Coordinates Missing

**Error:** `Store coordinates not configured`

**Solution:**
1. Update store with coordinates via API
2. Or provide `googleMapsUrl` (auto-extracts coordinates)

### Issue 2: Geofence Not Working

**Check:**
1. Store has valid coordinates
2. `geofenceRadius` is set (default: 100m)
3. Employee location is being sent correctly
4. Distance calculation is correct

### Issue 3: Wrong Coordinates

**Solution:**
1. Verify coordinates on Google Maps
2. Update via `PUT /api/hr/stores/:id`
3. Re-test geofence

---

## Summary

### ✅ Permanent Location Storage

1. **Store Model में `coordinates` field:**
   - `latitude` (Number, -90 to 90)
   - `longitude` (Number, -180 to 180)

2. **Geofence Radius:**
   - `geofenceRadius` (Number, 10-1000 meters, default: 100)

3. **Database Index:**
   - `2dsphere` index for fast geospatial queries

### ✅ How to Set Location

1. **Store Creation:** Include `coordinates` in POST request
2. **Store Update:** Update `coordinates` via PUT request
3. **Auto-extract:** Provide `googleMapsUrl` (extracts coordinates automatically)

### ✅ Geofencing Flow

1. **Clock-in:** Check if employee is within store geofence
2. **Location Tracking:** Monitor employee location vs store permanent location
3. **Auto-logout:** If employee moves outside geofence radius

### ✅ Best Practices

1. Use Google Maps Geocoding API for accurate coordinates
2. Set appropriate `geofenceRadius` based on store size
3. Validate coordinates before saving
4. Use `2dsphere` index for performance
5. Test geofence with `/api/hr/stores/:id/verify-geofence`

---

## Next Steps

1. ✅ Ensure all stores have coordinates set
2. ✅ Set appropriate `geofenceRadius` for each store
3. ✅ Test geofencing with `/verify-geofence` endpoint
4. ✅ Monitor geofence violations in attendance logs
5. ✅ Update coordinates if store location changes

---

**Status:** Permanent location tracking already implemented! Just need to ensure all stores have coordinates set. 🎯
