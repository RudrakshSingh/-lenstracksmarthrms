# 🏪 Store API - Quick Reference Card

**For Frontend Developers**

---

## 🚀 Quick Start

### Base URL
```
https://98.70.245.87
```

### Authentication
```javascript
headers: {
  'Authorization': 'Bearer YOUR_TOKEN',
  'Content-Type': 'application/json'
}
```

---

## 📋 Endpoints Cheat Sheet

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/hr/stores` | Create store |
| GET | `/api/hr/stores` | List all stores |
| GET | `/api/hr/stores/:id` | Get single store |
| PUT | `/api/hr/stores/:id` | Update store |
| DELETE | `/api/hr/stores/:id` | Delete store |
| POST | `/api/hr/stores/:id/manager` | Assign manager |
| POST | `/api/hr/stores/:id/verify-geofence` | Check location |

---

## ✅ Create Store (Minimum)

```javascript
POST /api/hr/stores

{
  "name": "Mumbai Store",
  "code": "MUM-001",
  "address": {
    "street": "123 Main St",
    "city": "Mumbai"
  }
}
```

---

## 🗺️ Create Store (With Google Maps)

```javascript
POST /api/hr/stores

{
  "name": "Mumbai Store",
  "code": "MUM-001",
  "address": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zipCode": "400001"
  },
  "googleMapsUrl": "https://maps.google.com/?q=19.0760,72.8777",
  "geofenceRadius": 100,
  "contact": {
    "phone": "+919876543210",
    "email": "store@example.com"
  },
  "status": "active",
  "store_type": "retail"
}
```

**Coordinates are auto-extracted from URL!**

---

## 📝 Update Store

```javascript
PUT /api/hr/stores/:id

// Only send what you want to change
{
  "name": "New Name",
  "status": "inactive",
  "geofenceRadius": 150
}
```

---

## 📍 Verify Geofence

```javascript
POST /api/hr/stores/:id/verify-geofence

{
  "latitude": 19.0760,
  "longitude": 72.8777
}

// Response
{
  "success": true,
  "data": {
    "withinGeofence": true,
    "distance": 0,
    "geofenceRadius": 100
  }
}
```

---

## 🔍 List Stores (With Filters)

```javascript
GET /api/hr/stores?page=1&limit=10&search=Mumbai&status=active&city=Mumbai
```

### Query Parameters
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `search` - Search in name/code
- `status` - Filter by status (active, inactive, etc.)
- `city` - Filter by city
- `state` - Filter by state
- `store_type` - Filter by type (retail, warehouse, etc.)

---

## 📦 Response Format

### Success
```json
{
  "success": true,
  "message": "Store created successfully",
  "data": { /* store object */ }
}
```

### Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "code",
      "message": "Store code is required"
    }
  ]
}
```

---

## ⚡ Google Maps URLs Supported

```
✅ https://maps.google.com/?q=19.0760,72.8777
✅ https://www.google.com/maps?q=19.0760,72.8777
✅ https://www.google.com/maps/place/19.0760,72.8777
✅ https://www.google.com/maps/@19.0760,72.8777,15z
✅ https://goo.gl/maps/...
```

---

## 📊 Field Validation

| Field | Required | Type | Constraints |
|-------|----------|------|-------------|
| `name` | ✅ Yes | String | 2-100 chars |
| `code` | ✅ Yes | String | 2-20 chars, unique |
| `address.street` | ✅ Yes | String | 1-200 chars |
| `address.city` | ✅ Yes | String | 1-100 chars |
| `address.state` | ❌ No | String | 1-100 chars |
| `address.zipCode` | ❌ No | String | 6 digits |
| `googleMapsUrl` | ❌ No | String | Valid Google Maps URL |
| `geofenceRadius` | ❌ No | Number | 10-1000 meters |
| `status` | ❌ No | Enum | active, inactive, maintenance, closed |
| `store_type` | ❌ No | Enum | retail, warehouse, office, field, other |

---

## 🎯 Status Values

```javascript
'active'      // Store is operational
'inactive'    // Store is temporarily closed
'maintenance' // Store under maintenance
'closed'      // Store permanently closed
```

---

## 🏢 Store Types

```javascript
'retail'      // Customer-facing store
'warehouse'   // Storage facility
'office'      // Office location
'field'       // Field/mobile location
'other'       // Other type
```

---

## 🔐 Required Roles

| Endpoint | Roles |
|----------|-------|
| Create Store | HR, Admin, SuperAdmin |
| Update Store | HR, Admin, SuperAdmin |
| Delete Store | HR, Admin, SuperAdmin |
| View Store | All authenticated users |
| List Stores | All authenticated users |
| Verify Geofence | All authenticated users |
| Assign Manager | HR, Admin, SuperAdmin |

---

## 💡 Pro Tips

### 1. Use Google Maps URL
**Don't** manually enter coordinates.  
**Do** paste Google Maps URL → coordinates auto-extracted!

### 2. Unique Store Codes
```javascript
// Good codes:
"MUM-001", "DEL-002", "BLR-003"

// Bad codes:
"Store1", "123", "test"
```

### 3. Geofence Defaults
- Default radius: 100 meters
- Min: 10 meters
- Max: 1000 meters

### 4. Partial Updates
Only send fields you want to change:
```javascript
// Don't send entire object
PUT /api/hr/stores/:id
{ "status": "inactive" }  // ✅ Good

// Instead of
{ name, code, address, ... , status: "inactive" }  // ❌ Unnecessary
```

---

## 🐛 Common Errors

### Duplicate Code
```json
{
  "success": false,
  "message": "Store with code MUM-001 already exists"
}
```
**Fix:** Use a different store code

### Invalid Google Maps URL
```json
{
  "success": false,
  "message": "Must be a valid Google Maps URL"
}
```
**Fix:** Use URL from maps.google.com

### Missing Required Fields
```json
{
  "success": false,
  "errors": [
    { "field": "address.city", "message": "City is required" }
  ]
}
```
**Fix:** Add missing required fields

### No Coordinates for Geofence
```json
{
  "success": false,
  "message": "Store coordinates not configured"
}
```
**Fix:** Add Google Maps URL or coordinates

---

## 📱 React Example

```tsx
// Create Store
const createStore = async (data) => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch('https://98.70.245.87/api/hr/stores', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  return await response.json();
};

// Usage
const store = await createStore({
  name: "Mumbai Store",
  code: "MUM-001",
  address: {
    street: "123 Main St",
    city: "Mumbai"
  },
  googleMapsUrl: "https://maps.google.com/?q=19.0760,72.8777"
});
```

---

## 🔗 Related APIs

- **Employee Management:** `/api/hr/employees`
- **Attendance:** `/api/attendance/`
- **User Auth:** `/api/auth/`

---

**Need More Details?**  
See: `FRONTEND_STORE_API_DOCUMENTATION.md` (Complete Guide)

---

**Version:** 1.0  
**Updated:** January 10, 2026  
**Base URL:** https://98.70.245.87
