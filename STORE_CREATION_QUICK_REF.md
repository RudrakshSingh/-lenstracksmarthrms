# 🏪 Store Creation - Quick Reference Card

**API Endpoint:** `POST /api/hr/stores`  
**Auth:** Bearer Token Required (HR/Admin/SuperAdmin)

---

## ⚡ Minimal Request (Copy & Paste)

```json
{
  "name": "Store Name",
  "code": "STORE-001",
  "address": {
    "street": "123 Main Street",
    "city": "Mumbai",
    "country": "India"
  }
}
```

---

## 🌟 Recommended Request (with Google Maps)

```json
{
  "name": "Etelios Store - Mumbai",
  "code": "ETELIOS-MUM-001",
  "address": {
    "street": "Shop No. 15, Nariman Point",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zipCode": "400021",
    "country": "India"
  },
  "contact": {
    "phone": "+91-9876543210",
    "email": "mumbai@etelios.com"
  },
  "googleMapsUrl": "https://maps.google.com/?q=18.9250,72.8258",
  "geofenceRadius": 150,
  "store_type": "retail",
  "status": "active"
}
```

---

## 📋 All Parameters

| Field | Required | Type | Example |
|-------|----------|------|---------|
| `name` | ✅ | string | "Store Name" |
| `code` | ✅ | string | "STORE-001" (unique, uppercase) |
| `address.street` | ✅ | string | "123 Main St" |
| `address.city` | ✅ | string | "Mumbai" |
| `address.country` | ⚪ | string | "India" (default) |
| `address.state` | ⚪ | string | "Maharashtra" |
| `address.zipCode` | ⚪ | string | "400021" |
| `googleMapsUrl` | ⚪ | string | "https://maps.google.com/?q=..." |
| `coordinates` | ⚪ | object | `{ latitude: 18.925, longitude: 72.8258 }` |
| `geofenceRadius` | ⚪ | number | 150 (10-1000, default: 100) |
| `contact.phone` | ⚪ | string | "+91-9876543210" |
| `contact.email` | ⚪ | string | "store@example.com" |
| `store_type` | ⚪ | string | "retail", "warehouse", "office" |
| `status` | ⚪ | string | "active", "inactive" |
| `manager` | ⚪ | object | `{ employeeId: "EMP-001" }` |
| `operatingHours` | ⚪ | object | See full docs |

---

## 🎯 JavaScript Example

```javascript
const createStore = async (token) => {
  const response = await fetch('https://98.70.245.87/api/hr/stores', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: "Store Name",
      code: "STORE-001",
      address: {
        street: "123 Main St",
        city: "Mumbai",
        country: "India"
      },
      googleMapsUrl: "https://maps.google.com/?q=18.9250,72.8258",
      geofenceRadius: 150
    })
  });
  
  return await response.json();
};
```

---

## ✅ Success Response

```json
{
  "success": true,
  "data": {
    "id": "store-uuid",
    "name": "Store Name",
    "code": "STORE-001",
    "latitude": 18.925,
    "longitude": 72.8258,
    "geofenceRadius": 150,
    "status": "active",
    "createdAt": "2026-01-10T09:40:22.893Z"
  },
  "message": "Store created successfully"
}
```

---

## ❌ Common Errors

| Code | Error | Solution |
|------|-------|----------|
| 400 | Validation failed | Check required fields |
| 401 | Authentication required | Add Bearer token |
| 403 | Insufficient permissions | User needs HR/Admin role |
| 409 | Store code already exists | Use unique code |

---

## 🗺️ Google Maps URL

**How to get:**
1. Open Google Maps
2. Right-click on location → "What's here?"
3. Copy URL or coordinates
4. Paste in `googleMapsUrl` field

**Supported formats:**
- `https://maps.google.com/?q=18.9250,72.8258`
- `https://www.google.com/maps/@18.9250,72.8258,15z`

**Backend automatically extracts coordinates!** ✨

---

## 🎯 Geofencing

- **Default:** 100 meters
- **Range:** 10-1000 meters
- **Recommended:** 
  - Small stores: 50-100m
  - Large stores: 150-300m
  - Campus: 300-500m

**Purpose:** Employees can only clock in/out within this radius

---

## 📞 Support

- Full Documentation: `FRONTEND_STORE_CREATION_GUIDE.md`
- Backend Team: backend-team@etelios.com
- API Base: `https://98.70.245.87/api/hr/stores`

