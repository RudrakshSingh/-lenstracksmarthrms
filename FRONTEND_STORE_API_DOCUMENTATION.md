# 🏪 Store Creation & Edit - Frontend Developer Guide

**Complete API Documentation for Store Management**

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Create Store API](#create-store-api)
4. [Edit Store API](#edit-store-api)
5. [Get Store API](#get-store-api)
6. [List Stores API](#list-stores-api)
7. [Delete Store API](#delete-store-api)
8. [Assign Manager API](#assign-manager-api)
9. [Verify Geofence API](#verify-geofence-api)
10. [Google Maps Integration](#google-maps-integration)
11. [Error Handling](#error-handling)
12. [Complete Examples](#complete-examples)
13. [Validation Rules](#validation-rules)
14. [Best Practices](#best-practices)

---

## Overview

### Base URL
```
Production: https://98.70.245.87
Staging: https://staging.etelios.com (if available)
Local: http://localhost:3000
```

### Store Entity Structure
```typescript
interface Store {
  _id: string;
  id: string;
  name: string;
  code: string;
  description?: string;
  
  // Address (REQUIRED)
  address: {
    street: string;
    city: string;
    state?: string;
    zipCode?: string;
    country?: string; // Default: "India"
  };
  
  // Location (OPTIONAL - can be extracted from Google Maps URL)
  coordinates?: {
    latitude: number;  // -90 to 90
    longitude: number; // -180 to 180
  };
  
  // OR flat coordinates
  latitude?: number;
  longitude?: number;
  
  // Google Maps (OPTIONAL)
  googleMapsUrl?: string;
  
  // Geofencing (OPTIONAL)
  geofenceRadius?: number; // 10-1000 meters, default 100
  
  // Contact (OPTIONAL)
  contact?: {
    phone?: string;
    email?: string;
  };
  
  // OR flat contact
  phone?: string;
  email?: string;
  
  // Manager (OPTIONAL)
  manager?: {
    employeeId: string;
  } | string; // ObjectId as string
  
  // Operating Hours (OPTIONAL)
  operatingHours?: {
    monday?: { open: string; close: string };
    tuesday?: { open: string; close: string };
    // ... other days
  };
  
  // Status
  status: 'active' | 'inactive' | 'maintenance' | 'closed';
  store_type: 'retail' | 'warehouse' | 'office' | 'field' | 'other';
  
  // Dates
  opening_date?: string; // ISO 8601
  closing_date?: string; // ISO 8601
  createdAt: string;
  updatedAt: string;
}
```

---

## Authentication

All store management APIs require authentication.

### Headers Required
```javascript
{
  'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
  'Content-Type': 'application/json'
}
```

### Getting Access Token
```javascript
// Login first
const loginResponse = await fetch('https://98.70.245.87/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    emailOrEmployeeId: 'admin@etelios.com',
    password: 'Admin@123456'
  })
});

const { data } = await loginResponse.json();
const accessToken = data.accessToken;
```

---

## Create Store API

### Endpoint
```
POST /api/hr/stores
```

### Required Permissions
- Roles: `HR`, `Admin`, `SuperAdmin`
- Permission: `store:create`

### Request Body

#### Minimum Required Fields
```json
{
  "name": "Store Name",
  "code": "STORE-CODE-001",
  "address": {
    "street": "123 Main Street",
    "city": "Mumbai"
  }
}
```

#### Complete Request (All Fields)
```json
{
  "name": "Etelios Mumbai Store",
  "code": "MUM-001",
  "description": "Main flagship store in Mumbai",
  
  "address": {
    "street": "123 MG Road",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zipCode": "400001",
    "country": "India"
  },
  
  "googleMapsUrl": "https://maps.google.com/?q=19.0760,72.8777",
  
  "coordinates": {
    "latitude": 19.0760,
    "longitude": 72.8777
  },
  
  "geofenceRadius": 100,
  
  "contact": {
    "phone": "+919876543210",
    "email": "mumbai.store@etelios.com"
  },
  
  "manager": {
    "employeeId": "EMP-2026-001"
  },
  
  "operatingHours": {
    "monday": { "open": "09:00", "close": "21:00" },
    "tuesday": { "open": "09:00", "close": "21:00" },
    "wednesday": { "open": "09:00", "close": "21:00" },
    "thursday": { "open": "09:00", "close": "21:00" },
    "friday": { "open": "09:00", "close": "21:00" },
    "saturday": { "open": "10:00", "close": "22:00" },
    "sunday": { "open": "10:00", "close": "20:00" }
  },
  
  "status": "active",
  "store_type": "retail",
  "opening_date": "2024-01-01"
}
```

### Response

#### Success (201 Created)
```json
{
  "success": true,
  "message": "Store created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "id": "507f1f77bcf86cd799439011",
    "name": "Etelios Mumbai Store",
    "code": "MUM-001",
    "description": "Main flagship store in Mumbai",
    
    "address": {
      "street": "123 MG Road",
      "city": "Mumbai",
      "state": "Maharashtra",
      "zipCode": "400001",
      "country": "India"
    },
    
    "coordinates": {
      "latitude": 19.076,
      "longitude": 72.8777
    },
    
    "latitude": 19.076,
    "longitude": 72.8777,
    
    "googleMapsUrl": "https://maps.google.com/?q=19.0760,72.8777",
    "geofenceRadius": 100,
    
    "contact": {
      "phone": "+919876543210",
      "email": "mumbai.store@etelios.com"
    },
    
    "phone": "+919876543210",
    "email": "mumbai.store@etelios.com",
    
    "manager": "507f191e810c19729de860ea",
    
    "operatingHours": { /* ... */ },
    
    "status": "active",
    "store_type": "retail",
    "is_active": true,
    "isDeleted": false,
    
    "opening_date": "2024-01-01T00:00:00.000Z",
    "createdAt": "2026-01-10T12:00:00.000Z",
    "updatedAt": "2026-01-10T12:00:00.000Z",
    
    "createdBy": "507f191e810c19729de860ea",
    "updatedBy": "507f191e810c19729de860ea"
  }
}
```

#### Error (400 Bad Request)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "code",
      "message": "Store code is required"
    },
    {
      "field": "address.city",
      "message": "City is required"
    }
  ]
}
```

#### Error (409 Conflict - Duplicate Code)
```json
{
  "success": false,
  "message": "Store with code MUM-001 already exists",
  "error": "DUPLICATE_STORE_CODE"
}
```

---

## Edit Store API

### Endpoint
```
PUT /api/hr/stores/:id
```

### Required Permissions
- Roles: `HR`, `Admin`, `SuperAdmin`
- Permission: `store:update`

### URL Parameters
- `id`: Store MongoDB ObjectId or ID

### Request Body

**NOTE:** Only send fields you want to UPDATE. All fields are optional.

#### Minimal Update (Change Name Only)
```json
{
  "name": "New Store Name"
}
```

#### Update Multiple Fields
```json
{
  "name": "Updated Mumbai Store",
  "status": "maintenance",
  
  "address": {
    "street": "456 New Address",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zipCode": "400002"
  },
  
  "contact": {
    "phone": "+919876543211",
    "email": "updated.store@etelios.com"
  },
  
  "geofenceRadius": 150,
  
  "googleMapsUrl": "https://maps.google.com/?q=19.0800,72.8800"
}
```

#### Update Operating Hours
```json
{
  "operatingHours": {
    "monday": { "open": "10:00", "close": "20:00" },
    "tuesday": { "open": "10:00", "close": "20:00" }
  }
}
```

#### Update Manager
```json
{
  "manager": {
    "employeeId": "EMP-2026-NEW"
  }
}
```

### Response

#### Success (200 OK)
```json
{
  "success": true,
  "message": "Store updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Updated Mumbai Store",
    "status": "maintenance",
    /* ... all store fields with updated values ... */
    "updatedAt": "2026-01-10T13:00:00.000Z"
  }
}
```

#### Error (404 Not Found)
```json
{
  "success": false,
  "message": "Store not found",
  "error": "STORE_NOT_FOUND"
}
```

#### Error (400 Bad Request - Invalid Data)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "geofenceRadius",
      "message": "Geofence radius must be between 10 and 1000 meters"
    }
  ]
}
```

---

## Get Store API

### Endpoint
```
GET /api/hr/stores/:id
```

### Required Permissions
- Roles: `HR`, `Admin`, `SuperAdmin`, `Manager`, `Employee`
- Permission: `store:read`

### URL Parameters
- `id`: Store MongoDB ObjectId or ID

### Response

#### Success (200 OK)
```json
{
  "success": true,
  "message": "Store retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "id": "507f1f77bcf86cd799439011",
    "name": "Etelios Mumbai Store",
    "code": "MUM-001",
    /* ... all store fields ... */
  }
}
```

#### Error (404 Not Found)
```json
{
  "success": false,
  "message": "Store not found"
}
```

---

## List Stores API

### Endpoint
```
GET /api/hr/stores
```

### Required Permissions
- Roles: `HR`, `Admin`, `SuperAdmin`, `Manager`, `Employee`
- Permission: `store:read`

### Query Parameters
```typescript
{
  page?: number;        // Default: 1
  limit?: number;       // Default: 10, Max: 100
  search?: string;      // Search in name, code
  status?: 'active' | 'inactive' | 'maintenance' | 'closed';
  store_type?: 'retail' | 'warehouse' | 'office' | 'field' | 'other';
  city?: string;        // Filter by city
  state?: string;       // Filter by state
  sortBy?: string;      // Field to sort by (e.g., 'name', 'createdAt')
  sortOrder?: 'asc' | 'desc'; // Default: 'asc'
}
```

### Example Requests
```javascript
// Get first page (10 stores)
GET /api/hr/stores

// Get page 2 with 20 stores
GET /api/hr/stores?page=2&limit=20

// Search for stores
GET /api/hr/stores?search=Mumbai

// Filter by status
GET /api/hr/stores?status=active

// Filter by city
GET /api/hr/stores?city=Mumbai

// Combine filters
GET /api/hr/stores?status=active&store_type=retail&city=Mumbai

// Sort by name
GET /api/hr/stores?sortBy=name&sortOrder=asc
```

### Response

#### Success (200 OK)
```json
{
  "success": true,
  "message": "Stores retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Store 1",
      "code": "STR-001",
      /* ... */
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Store 2",
      "code": "STR-002",
      /* ... */
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Delete Store API

### Endpoint
```
DELETE /api/hr/stores/:id
```

### Required Permissions
- Roles: `HR`, `Admin`, `SuperAdmin`
- Permission: `store:delete`

### URL Parameters
- `id`: Store MongoDB ObjectId or ID

### Response

#### Success (200 OK)
```json
{
  "success": true,
  "message": "Store deleted successfully"
}
```

#### Error (404 Not Found)
```json
{
  "success": false,
  "message": "Store not found"
}
```

---

## Assign Manager API

### Endpoint
```
POST /api/hr/stores/:id/manager
```

### Required Permissions
- Roles: `HR`, `Admin`, `SuperAdmin`
- Permission: `store:assign_manager`

### URL Parameters
- `id`: Store MongoDB ObjectId or ID

### Request Body
```json
{
  "employeeId": "EMP-2026-001"
}
```

### Response

#### Success (200 OK)
```json
{
  "success": true,
  "message": "Store manager assigned successfully",
  "data": {
    "storeId": "507f1f77bcf86cd799439011",
    "storeName": "Mumbai Store",
    "manager": {
      "id": "507f191e810c19729de860ea",
      "employeeId": "EMP-2026-001",
      "name": "John Doe",
      "assignedAt": "2026-01-10T12:00:00.000Z"
    },
    "previousManager": {
      "id": "507f191e810c19729de860eb"
    }
  }
}
```

---

## Verify Geofence API

### Endpoint
```
POST /api/hr/stores/:id/verify-geofence
```

### Required Permissions
- Roles: All authenticated users
- Permission: `store:verify_geofence`

### URL Parameters
- `id`: Store MongoDB ObjectId or ID

### Request Body
```json
{
  "latitude": 19.0760,
  "longitude": 72.8777
}
```

### Response

#### Success - Within Geofence (200 OK)
```json
{
  "success": true,
  "message": "Location verified. You are within the store geofence.",
  "data": {
    "withinGeofence": true,
    "distance": 0,
    "distanceUnit": "meters",
    "geofenceRadius": 100,
    "excess": 0,
    "store": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Mumbai Store",
      "code": "MUM-001",
      "coordinates": {
        "latitude": 19.076,
        "longitude": 72.8777
      }
    },
    "checkedAt": "2026-01-10T12:00:00.000Z"
  }
}
```

#### Success - Outside Geofence (200 OK)
```json
{
  "success": true,
  "message": "You are 234 meters outside the store geofence.",
  "data": {
    "withinGeofence": false,
    "distance": 334,
    "distanceUnit": "meters",
    "geofenceRadius": 100,
    "excess": 234,
    "store": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Mumbai Store",
      "code": "MUM-001",
      "coordinates": {
        "latitude": 19.076,
        "longitude": 72.8777
      }
    },
    "checkedAt": "2026-01-10T12:00:00.000Z"
  }
}
```

#### Error - Store Has No Coordinates (400 Bad Request)
```json
{
  "success": false,
  "error": {
    "error": "Store coordinates not configured",
    "message": "This store does not have GPS coordinates set. Please update the store with a Google Maps URL or coordinates to enable geofencing."
  },
  "message": "Geofence verification failed"
}
```

---

## Google Maps Integration

### Supported URL Formats

The backend automatically extracts coordinates from various Google Maps URL formats:

#### Format 1: Query Parameter
```
https://maps.google.com/?q=19.0760,72.8777
https://www.google.com/maps?q=19.0760,72.8777
```

#### Format 2: Place URL
```
https://www.google.com/maps/place/19.0760,72.8777
https://maps.google.com/maps/place/@19.0760,72.8777
```

#### Format 3: Direct Coordinates
```
https://www.google.com/maps/@19.0760,72.8777,15z
https://maps.google.com/@19.0760,72.8777,15z/data=...
```

#### Format 4: Shortened URL
```
https://goo.gl/maps/abcd1234
```

### Coordinate Extraction Logic

When you provide a `googleMapsUrl`, the backend:
1. ✅ Validates it's a valid Google Maps URL
2. ✅ Extracts latitude and longitude
3. ✅ Saves to both:
   - `coordinates.latitude` and `coordinates.longitude`
   - `latitude` and `longitude` (flat fields)
4. ✅ Saves the original URL to `googleMapsUrl`

### Example: Create Store with Google Maps URL

```javascript
// You only need to provide the URL
const response = await fetch('https://98.70.245.87/api/hr/stores', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: "Mumbai Store",
    code: "MUM-001",
    address: {
      street: "123 MG Road",
      city: "Mumbai"
    },
    googleMapsUrl: "https://maps.google.com/?q=19.0760,72.8777"
    // No need to provide coordinates manually!
  })
});

// Response will include extracted coordinates
const { data } = await response.json();
console.log(data.coordinates);
// { latitude: 19.076, longitude: 72.8777 }
```

### Manual Coordinates (Alternative)

If you don't have a Google Maps URL, you can provide coordinates directly:

```javascript
{
  "name": "Mumbai Store",
  "code": "MUM-001",
  "address": { /* ... */ },
  "coordinates": {
    "latitude": 19.0760,
    "longitude": 72.8777
  },
  "geofenceRadius": 100
}
```

---

## Error Handling

### Common Error Codes

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | VALIDATION_ERROR | Invalid request data |
| 401 | UNAUTHORIZED | Missing or invalid authentication |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Store not found |
| 409 | CONFLICT | Duplicate store code |
| 500 | INTERNAL_ERROR | Server error |

### Error Response Format
```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "ERROR_CODE",
  "errors": [
    {
      "field": "fieldName",
      "message": "Field-specific error"
    }
  ]
}
```

### Frontend Error Handling Example
```javascript
try {
  const response = await fetch('/api/hr/stores', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(storeData)
  });
  
  const result = await response.json();
  
  if (!result.success) {
    // Handle specific errors
    if (response.status === 409) {
      alert('Store code already exists. Please use a different code.');
    } else if (response.status === 400 && result.errors) {
      // Show validation errors
      result.errors.forEach(err => {
        console.error(`${err.field}: ${err.message}`);
      });
    } else {
      alert(result.message || 'Failed to create store');
    }
    return;
  }
  
  // Success
  console.log('Store created:', result.data);
  
} catch (error) {
  console.error('Network error:', error);
  alert('Failed to connect to server');
}
```

---

## Complete Examples

### Example 1: Create Store Form (React)

```typescript
import React, { useState } from 'react';

interface StoreFormData {
  name: string;
  code: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  googleMapsUrl: string;
  geofenceRadius: number;
  contact: {
    phone: string;
    email: string;
  };
  status: 'active' | 'inactive';
  store_type: 'retail' | 'warehouse' | 'office';
}

export function CreateStoreForm() {
  const [formData, setFormData] = useState<StoreFormData>({
    name: '',
    code: '',
    description: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    },
    googleMapsUrl: '',
    geofenceRadius: 100,
    contact: {
      phone: '',
      email: ''
    },
    status: 'active',
    store_type: 'retail'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch('https://98.70.245.87/api/hr/stores', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (!result.success) {
        setError(result.message);
        return;
      }
      
      // Success
      alert('Store created successfully!');
      // Redirect or reset form
      
    } catch (err) {
      setError('Failed to create store. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <h2>Create New Store</h2>
      
      {error && <div className="error">{error}</div>}
      
      <div>
        <label>Store Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      
      <div>
        <label>Store Code *</label>
        <input
          type="text"
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          placeholder="e.g., MUM-001"
          required
        />
      </div>
      
      <div>
        <label>Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      
      <fieldset>
        <legend>Address *</legend>
        
        <div>
          <label>Street *</label>
          <input
            type="text"
            value={formData.address.street}
            onChange={(e) => setFormData({
              ...formData,
              address: { ...formData.address, street: e.target.value }
            })}
            required
          />
        </div>
        
        <div>
          <label>City *</label>
          <input
            type="text"
            value={formData.address.city}
            onChange={(e) => setFormData({
              ...formData,
              address: { ...formData.address, city: e.target.value }
            })}
            required
          />
        </div>
        
        <div>
          <label>State</label>
          <input
            type="text"
            value={formData.address.state}
            onChange={(e) => setFormData({
              ...formData,
              address: { ...formData.address, state: e.target.value }
            })}
          />
        </div>
        
        <div>
          <label>ZIP Code</label>
          <input
            type="text"
            value={formData.address.zipCode}
            onChange={(e) => setFormData({
              ...formData,
              address: { ...formData.address, zipCode: e.target.value }
            })}
            pattern="[0-9]{6}"
          />
        </div>
      </fieldset>
      
      <div>
        <label>Google Maps URL</label>
        <input
          type="url"
          value={formData.googleMapsUrl}
          onChange={(e) => setFormData({ ...formData, googleMapsUrl: e.target.value })}
          placeholder="https://maps.google.com/?q=19.0760,72.8777"
        />
        <small>Paste Google Maps link to auto-extract coordinates</small>
      </div>
      
      <div>
        <label>Geofence Radius (meters)</label>
        <input
          type="number"
          value={formData.geofenceRadius}
          onChange={(e) => setFormData({ ...formData, geofenceRadius: parseInt(e.target.value) })}
          min="10"
          max="1000"
        />
      </div>
      
      <fieldset>
        <legend>Contact</legend>
        
        <div>
          <label>Phone</label>
          <input
            type="tel"
            value={formData.contact.phone}
            onChange={(e) => setFormData({
              ...formData,
              contact: { ...formData.contact, phone: e.target.value }
            })}
            placeholder="+919876543210"
          />
        </div>
        
        <div>
          <label>Email</label>
          <input
            type="email"
            value={formData.contact.email}
            onChange={(e) => setFormData({
              ...formData,
              contact: { ...formData.contact, email: e.target.value }
            })}
            placeholder="store@example.com"
          />
        </div>
      </fieldset>
      
      <div>
        <label>Store Type</label>
        <select
          value={formData.store_type}
          onChange={(e) => setFormData({ ...formData, store_type: e.target.value as any })}
        >
          <option value="retail">Retail</option>
          <option value="warehouse">Warehouse</option>
          <option value="office">Office</option>
          <option value="field">Field</option>
          <option value="other">Other</option>
        </select>
      </div>
      
      <div>
        <label>Status</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Store'}
      </button>
    </form>
  );
}
```

### Example 2: Edit Store (React)

```typescript
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export function EditStoreForm() {
  const { storeId } = useParams<{ storeId: string }>();
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch store data
  useEffect(() => {
    const fetchStore = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`https://98.70.245.87/api/hr/stores/${storeId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const result = await response.json();
        if (result.success) {
          setStore(result.data);
        } else {
          setError('Store not found');
        }
      } catch (err) {
        setError('Failed to load store');
      }
    };
    
    fetchStore();
  }, [storeId]);
  
  const handleUpdate = async (updates: Partial<any>) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`https://98.70.245.87/api/hr/stores/${storeId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      const result = await response.json();
      
      if (!result.success) {
        setError(result.message);
        return;
      }
      
      setStore(result.data);
      alert('Store updated successfully!');
      
    } catch (err) {
      setError('Failed to update store');
    } finally {
      setLoading(false);
    }
  };
  
  if (!store) {
    return <div>Loading...</div>;
  }
  
  return (
    <div>
      <h2>Edit Store: {store.name}</h2>
      
      {error && <div className="error">{error}</div>}
      
      {/* Render form similar to create, but with existing values */}
      {/* Only send changed fields in handleUpdate */}
      
      <button
        onClick={() => handleUpdate({ status: 'inactive' })}
        disabled={loading}
      >
        Deactivate Store
      </button>
      
      <button
        onClick={() => handleUpdate({
          geofenceRadius: 150,
          contact: {
            phone: '+919999999999'
          }
        })}
        disabled={loading}
      >
        Update Geofence & Contact
      </button>
    </div>
  );
}
```

### Example 3: Store List with Filtering (React)

```typescript
import React, { useState, useEffect } from 'react';

export function StoreList() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    city: ''
  });
  
  const fetchStores = async () => {
    setLoading(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      
      // Build query string
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.city) params.append('city', filters.city);
      
      const response = await fetch(
        `https://98.70.245.87/api/hr/stores?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        setStores(result.data);
        setPagination(result.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch stores:', err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchStores();
  }, [pagination.page, filters]);
  
  return (
    <div>
      <h2>Stores</h2>
      
      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
          <option value="closed">Closed</option>
        </select>
        
        <input
          type="text"
          placeholder="Filter by city"
          value={filters.city}
          onChange={(e) => setFilters({ ...filters, city: e.target.value })}
        />
      </div>
      
      {/* Store List */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>City</th>
              <th>Status</th>
              <th>Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((store) => (
              <tr key={store._id}>
                <td>{store.code}</td>
                <td>{store.name}</td>
                <td>{store.address.city}</td>
                <td>{store.status}</td>
                <td>{store.store_type}</td>
                <td>
                  <button onClick={() => window.location.href = `/stores/${store._id}/edit`}>
                    Edit
                  </button>
                  <button onClick={() => viewStore(store._id)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      {/* Pagination */}
      <div className="pagination">
        <button
          onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
          disabled={!pagination.hasPrev}
        >
          Previous
        </button>
        
        <span>
          Page {pagination.page} of {pagination.pages}
        </span>
        
        <button
          onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
          disabled={!pagination.hasNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

---

## Validation Rules

### Store Name
- **Required:** Yes
- **Type:** String
- **Min Length:** 2 characters
- **Max Length:** 100 characters
- **Pattern:** Any characters

### Store Code
- **Required:** Yes
- **Type:** String
- **Min Length:** 2 characters
- **Max Length:** 20 characters
- **Pattern:** Alphanumeric, hyphens, underscores (uppercase recommended)
- **Unique:** Yes (per tenant)

### Address
- **street:** Required, 1-200 characters
- **city:** Required, 1-100 characters
- **state:** Optional, 1-100 characters
- **zipCode:** Optional, 6 digits (for India)
- **country:** Optional, defaults to "India"

### Coordinates
- **latitude:** Optional, -90 to 90
- **longitude:** Optional, -180 to 180
- **Note:** Auto-extracted from Google Maps URL if provided

### Google Maps URL
- **Required:** No
- **Type:** String (valid URL)
- **Validation:** Must be from valid Google Maps domains:
  - maps.google.com
  - www.google.com
  - google.com
  - goo.gl
- **Pattern:** Various formats supported (see [Google Maps Integration](#google-maps-integration))

### Geofence Radius
- **Required:** No
- **Type:** Number
- **Default:** 100 meters
- **Min:** 10 meters
- **Max:** 1000 meters

### Contact
- **phone:** Optional, matches pattern `/^\+?[\d\s-()]{7,20}$/`
- **email:** Optional, valid email format, max 254 characters

### Status
- **Required:** No
- **Type:** Enum
- **Values:** 'active', 'inactive', 'maintenance', 'closed'
- **Default:** 'active'

### Store Type
- **Required:** No
- **Type:** Enum
- **Values:** 'retail', 'warehouse', 'office', 'field', 'other'
- **Default:** 'retail'

---

## Best Practices

### 1. Store Code Generation
```javascript
// Generate unique store codes
function generateStoreCode(city, sequence) {
  const cityCode = city.substring(0, 3).toUpperCase();
  const paddedSequence = sequence.toString().padStart(3, '0');
  return `${cityCode}-${paddedSequence}`;
}

// Example: generateStoreCode('Mumbai', 1) => 'MUM-001'
```

### 2. Google Maps URL Validation (Frontend)
```javascript
function isValidGoogleMapsUrl(url) {
  try {
    const urlObj = new URL(url);
    const validDomains = [
      'maps.google.com',
      'www.google.com',
      'google.com',
      'goo.gl'
    ];
    return validDomains.some(domain => urlObj.hostname.endsWith(domain));
  } catch {
    return false;
  }
}
```

### 3. Optimistic UI Updates
```javascript
// Update UI immediately, rollback on error
async function updateStore(storeId, updates) {
  const oldStore = { ...currentStore };
  
  // Optimistically update UI
  setStore({ ...currentStore, ...updates });
  
  try {
    const result = await api.updateStore(storeId, updates);
    setStore(result.data);
  } catch (error) {
    // Rollback on error
    setStore(oldStore);
    alert('Failed to update store');
  }
}
```

### 4. Debounced Search
```javascript
import { debounce } from 'lodash';

const debouncedSearch = debounce((searchTerm) => {
  fetchStores({ search: searchTerm });
}, 500);

// Usage in input
<input
  onChange={(e) => debouncedSearch(e.target.value)}
  placeholder="Search stores..."
/>
```

### 5. Coordinate Display
```javascript
function formatCoordinates(lat, lng) {
  if (!lat || !lng) return 'Not set';
  return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
}

// Display: "19.0760°, 72.8777°"
```

### 6. Geofence Visualization
```javascript
// Calculate if user is within geofence
function checkGeofence(userLat, userLng, storeLat, storeLng, radius) {
  const R = 6371000; // Earth radius in meters
  const φ1 = userLat * Math.PI / 180;
  const φ2 = storeLat * Math.PI / 180;
  const Δφ = (storeLat - userLat) * Math.PI / 180;
  const Δλ = (storeLng - userLng) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const distance = R * c;
  return {
    withinGeofence: distance <= radius,
    distance: Math.round(distance)
  };
}
```

### 7. Error Message Display
```javascript
function displayErrors(errors) {
  if (Array.isArray(errors)) {
    return errors.map(err => (
      <div key={err.field} className="error">
        <strong>{err.field}:</strong> {err.message}
      </div>
    ));
  }
  return <div className="error">{errors}</div>;
}
```

### 8. Loading States
```javascript
// Show loading spinner during operations
function StoreForm() {
  const [loading, setLoading] = useState({
    fetch: false,
    save: false,
    delete: false
  });
  
  return (
    <>
      {loading.save && <LoadingSpinner message="Saving store..." />}
      {/* ... form fields ... */}
      <button disabled={loading.save}>
        {loading.save ? 'Saving...' : 'Save Store'}
      </button>
    </>
  );
}
```

---

## TypeScript Types (Bonus)

```typescript
// types/store.ts

export interface StoreAddress {
  street: string;
  city: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface StoreCoordinates {
  latitude: number;
  longitude: number;
}

export interface StoreContact {
  phone?: string;
  email?: string;
}

export interface OperatingHours {
  open: string;
  close: string;
}

export interface StoreOperatingHours {
  monday?: OperatingHours;
  tuesday?: OperatingHours;
  wednesday?: OperatingHours;
  thursday?: OperatingHours;
  friday?: OperatingHours;
  saturday?: OperatingHours;
  sunday?: OperatingHours;
}

export type StoreStatus = 'active' | 'inactive' | 'maintenance' | 'closed';
export type StoreType = 'retail' | 'warehouse' | 'office' | 'field' | 'other';

export interface Store {
  _id: string;
  id: string;
  name: string;
  code: string;
  description?: string;
  
  address: StoreAddress;
  
  coordinates?: StoreCoordinates;
  latitude?: number;
  longitude?: number;
  
  googleMapsUrl?: string;
  geofenceRadius?: number;
  
  contact?: StoreContact;
  phone?: string;
  email?: string;
  
  manager?: string;
  operatingHours?: StoreOperatingHours;
  
  status: StoreStatus;
  store_type: StoreType;
  is_active: boolean;
  isDeleted: boolean;
  
  opening_date?: string;
  closing_date?: string;
  
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateStoreRequest {
  name: string;
  code: string;
  description?: string;
  address: StoreAddress;
  googleMapsUrl?: string;
  coordinates?: StoreCoordinates;
  geofenceRadius?: number;
  contact?: StoreContact;
  manager?: { employeeId: string };
  operatingHours?: StoreOperatingHours;
  status?: StoreStatus;
  store_type?: StoreType;
  opening_date?: string;
}

export interface UpdateStoreRequest {
  name?: string;
  code?: string;
  description?: string;
  address?: Partial<StoreAddress>;
  googleMapsUrl?: string;
  coordinates?: StoreCoordinates;
  geofenceRadius?: number;
  contact?: StoreContact;
  manager?: { employeeId: string };
  operatingHours?: StoreOperatingHours;
  status?: StoreStatus;
  store_type?: StoreType;
  opening_date?: string;
  closing_date?: string;
}

export interface StoreListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: StoreStatus;
  store_type?: StoreType;
  city?: string;
  state?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface StoreListResponse {
  success: boolean;
  message: string;
  data: Store[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface GeofenceVerificationRequest {
  latitude: number;
  longitude: number;
}

export interface GeofenceVerificationResponse {
  success: boolean;
  message: string;
  data: {
    withinGeofence: boolean;
    distance: number;
    distanceUnit: 'meters';
    geofenceRadius: number;
    excess: number;
    store: {
      id: string;
      name: string;
      code: string;
      coordinates: StoreCoordinates;
    };
    checkedAt: string;
  };
}
```

---

## Quick Reference

### Endpoints Summary
```
POST   /api/hr/stores                        - Create store
GET    /api/hr/stores                        - List stores
GET    /api/hr/stores/:id                    - Get store
PUT    /api/hr/stores/:id                    - Update store
DELETE /api/hr/stores/:id                    - Delete store
POST   /api/hr/stores/:id/manager            - Assign manager
POST   /api/hr/stores/:id/verify-geofence    - Verify geofence
```

### Required Fields
```javascript
{
  name: string,         // 2-100 chars
  code: string,         // 2-20 chars, unique
  address: {
    street: string,     // 1-200 chars
    city: string        // 1-100 chars
  }
}
```

### Optional but Recommended
```javascript
{
  googleMapsUrl: string,           // Auto-extracts coordinates
  geofenceRadius: number,          // 10-1000 meters
  contact: { phone, email },
  status: string,                  // 'active', 'inactive', etc.
  store_type: string              // 'retail', 'warehouse', etc.
}
```

---

**Documentation Version:** 1.0  
**Last Updated:** January 10, 2026  
**API Version:** 1.0  
**Base URL:** https://98.70.245.87

---

For questions or issues, contact the backend team or refer to the main API documentation.
