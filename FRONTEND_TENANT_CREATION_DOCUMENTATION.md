# 🏢 TENANT CREATION API - FRONTEND DEVELOPER GUIDE

**Last Updated:** January 13, 2026  
**API Base URL:** `https://api.etelios.com`  
**Environment:** Production  
**Status:** ✅ Operational

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Create Tenant Endpoint](#create-tenant-endpoint)
4. [Request Format](#request-format)
5. [Response Format](#response-format)
6. [Error Handling](#error-handling)
7. [Code Examples](#code-examples)
8. [Validation Rules](#validation-rules)
9. [Best Practices](#best-practices)

---

## 🎯 OVERVIEW

The Tenant Creation API allows frontend applications to create new tenant organizations in the system. Each tenant gets:
- Unique tenant ID and subdomain
- Dedicated database
- Admin user account
- Subscription plan
- Custom configuration

---

## 🔐 AUTHENTICATION

### Required Role
- **Super Admin** or **Admin** role required
- Must be authenticated with valid JWT token

### Headers
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Getting Access Token
```javascript
// Login first to get token
const loginResponse = await fetch('https://api.etelios.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@etelios.com',
    password: 'Admin@123456'
  })
});

const { data } = await loginResponse.json();
const accessToken = data.accessToken;
```

---

## 📝 CREATE TENANT ENDPOINT

### Endpoint
```http
POST /api/tenants
```

### Service
- **Service:** Tenant Registry Service
- **Port:** 3017
- **Database:** tenant-db

---

## 📤 REQUEST FORMAT

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `name` | string | Tenant/Company name (2-200 chars) | `"Acme Corporation"` |
| `email` | string | Primary contact email (valid email) | `"admin@acme.com"` |

### Optional Fields

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `subdomain` | string | Tenant subdomain (alphanumeric) | Auto-generated from name |
| `domain` | string | Full domain name | `{subdomain}.etelios.com` |
| `phone` | string | Contact phone number | - |
| `address` | string/object | Address (string or object) | - |
| `city` | string | City name | - |
| `state` | string | State/Province | - |
| `country` | string | Country name | `"India"` |
| `plan` | string | Subscription plan | `"Basic"` |
| `primaryContact` | string | Primary contact name | - |
| `primaryEmail` | string | Primary contact email | Uses `email` |
| `primaryPhone` | string | Primary contact phone | Uses `phone` |
| `modules` | array | Enabled modules | `[]` |
| `timezone` | string | Timezone | `"Asia/Kolkata"` |
| `currency` | string | Currency code | `"INR"` |
| `language` | string | Language code | `"en"` |
| `dateFormat` | string | Date format | `"DD/MM/YYYY"` |

### Subscription Plans

Valid plan values:
- `"Trial"` or `"trial"`
- `"Basic"` or `"basic"`
- `"Professional"` or `"professional"`
- `"Enterprise"` or `"enterprise"`
- `"Enterprise Plus"` or `"enterprise-plus"`

### Available Modules

Valid module values:
- `"hr"` - HR Management
- `"crm"` - Customer Relationship Management
- `"inventory"` - Inventory Management
- `"financial"` - Financial Management
- `"sales"` - Sales Management
- `"purchase"` - Purchase Management
- `"analytics"` - Analytics
- `"reports"` - Reports

### Address Format

**Option 1: String Format**
```json
{
  "address": "123 Main Street, Mumbai"
}
```

**Option 2: Object Format**
```json
{
  "address": {
    "street": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "pincode": "400001"
  }
}
```

---

## 📥 RESPONSE FORMAT

### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Tenant created successfully",
  "data": {
    "tenantId": "acmecorporation",
    "name": "Acme Corporation",
    "email": "admin@acme.com",
    "domain": "acmecorporation.etelios.com",
    "subdomain": "acmecorporation",
    "phone": "+91-9876543210",
    "address": {
      "street": "123 Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India"
    },
    "plan": "Basic",
    "subscription": {
      "plan": "Basic",
      "startDate": "2026-01-13T00:00:00.000Z",
      "endDate": "2026-02-13T00:00:00.000Z",
      "status": "active",
      "trialDays": 30
    },
    "settings": {
      "timezone": "Asia/Kolkata",
      "currency": "INR",
      "language": "en",
      "dateFormat": "DD/MM/YYYY"
    },
    "modules": ["hr", "crm"],
    "status": "active",
    "createdAt": "2026-01-13T12:00:00.000Z",
    "database": "tenant-db"
  }
}
```

### Error Responses

#### 400 Bad Request - Validation Error
```json
{
  "success": false,
  "message": "Validation error",
  "error": "VALIDATION_ERROR",
  "errors": [
    "name is required",
    "email must be a valid email"
  ]
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required",
  "error": "UNAUTHORIZED"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions",
  "error": "FORBIDDEN"
}
```

#### 409 Conflict - Tenant Already Exists
```json
{
  "success": false,
  "message": "Tenant already exists",
  "error": "TENANT_EXISTS",
  "details": "A tenant with this email, domain, or subdomain already exists"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "An internal server error occurred",
  "error": "INTERNAL_ERROR"
}
```

---

## 💻 CODE EXAMPLES

### JavaScript/Fetch API

```javascript
async function createTenant(tenantData, accessToken) {
  try {
    const response = await fetch('https://api.etelios.com/api/tenants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tenantData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to create tenant');
    }

    return result.data;
  } catch (error) {
    console.error('Tenant creation error:', error);
    throw error;
  }
}

// Usage
const tenantData = {
  name: "Acme Corporation",
  email: "admin@acme.com",
  phone: "+91-9876543210",
  address: {
    street: "123 Main Street",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    pincode: "400001"
  },
  plan: "Basic",
  modules: ["hr", "crm"],
  timezone: "Asia/Kolkata",
  currency: "INR"
};

const tenant = await createTenant(tenantData, accessToken);
console.log('Tenant created:', tenant.tenantId);
```

### Axios

```javascript
import axios from 'axios';

const API_BASE = 'https://api.etelios.com';

// Create axios instance with auth
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Create tenant function
async function createTenant(tenantData) {
  try {
    const { data } = await api.post('/api/tenants', tenantData);
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    if (error.response) {
      // Server responded with error
      const { status, data } = error.response;
      
      if (status === 409) {
        throw new Error('Tenant already exists');
      } else if (status === 400) {
        throw new Error(data.errors?.join(', ') || data.message);
      } else {
        throw new Error(data.message || 'Failed to create tenant');
      }
    } else {
      // Network error
      throw new Error('Network error. Please check your connection.');
    }
  }
}

// Usage
const tenant = await createTenant({
  name: "Acme Corporation",
  email: "admin@acme.com",
  plan: "Professional",
  modules: ["hr", "crm", "inventory"]
});
```

### React Hook Example

```javascript
import { useState } from 'react';
import axios from 'axios';

function useCreateTenant() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createTenant = async (tenantData) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        'https://api.etelios.com/api/tenants',
        tenantData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createTenant, loading, error };
}

// Usage in component
function TenantCreationForm() {
  const { createTenant, loading, error } = useCreateTenant();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    plan: 'Basic'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const tenant = await createTenant(formData);
      console.log('Tenant created:', tenant);
      // Redirect or show success message
    } catch (err) {
      console.error('Failed to create tenant:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Tenant'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
```

### cURL Example

```bash
curl -X POST "https://api.etelios.com/api/tenants" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corporation",
    "email": "admin@acme.com",
    "phone": "+91-9876543210",
    "address": {
      "street": "123 Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India"
    },
    "plan": "Basic",
    "modules": ["hr", "crm"],
    "timezone": "Asia/Kolkata",
    "currency": "INR"
  }'
```

---

## ✅ VALIDATION RULES

### Name
- **Required:** Yes
- **Type:** String
- **Min Length:** 2 characters
- **Max Length:** 200 characters
- **Trimmed:** Yes

### Email
- **Required:** Yes
- **Type:** String (valid email format)
- **Case:** Converted to lowercase
- **Unique:** Must not exist in system

### Subdomain
- **Required:** No (auto-generated if not provided)
- **Type:** String (alphanumeric only)
- **Case:** Converted to lowercase
- **Unique:** Must not exist in system
- **Auto-generation:** Generated from `name` if not provided
  - Removes special characters
  - Converts to lowercase
  - Max 50 characters

### Domain
- **Required:** No (auto-generated if not provided)
- **Type:** String
- **Format:** `{subdomain}.etelios.com`
- **Unique:** Must not exist in system

### Plan
- **Required:** No
- **Default:** `"Basic"`
- **Valid Values:** 
  - `"Trial"`, `"trial"`
  - `"Basic"`, `"basic"`
  - `"Professional"`, `"professional"`
  - `"Enterprise"`, `"enterprise"`
  - `"Enterprise Plus"`, `"enterprise-plus"`

### Modules
- **Required:** No
- **Type:** Array of strings
- **Valid Values:** `"hr"`, `"crm"`, `"inventory"`, `"financial"`, `"sales"`, `"purchase"`, `"analytics"`, `"reports"`
- **Default:** `[]`

### Timezone
- **Required:** No
- **Default:** `"Asia/Kolkata"`
- **Type:** String (IANA timezone)

### Currency
- **Required:** No
- **Default:** `"INR"`
- **Type:** String (ISO 4217 currency code)

### Language
- **Required:** No
- **Default:** `"en"`
- **Type:** String (ISO 639-1 language code)

### Date Format
- **Required:** No
- **Default:** `"DD/MM/YYYY"`
- **Type:** String

---

## 🎯 BEST PRACTICES

### 1. **Subdomain Generation**
```javascript
// Frontend can generate subdomain from name
function generateSubdomain(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 50);
}

// Or let backend auto-generate
// Just don't provide subdomain field
```

### 2. **Error Handling**
```javascript
async function createTenantWithErrorHandling(tenantData) {
  try {
    const tenant = await createTenant(tenantData);
    return { success: true, data: tenant };
  } catch (error) {
    if (error.response?.status === 409) {
      return {
        success: false,
        error: 'TENANT_EXISTS',
        message: 'A tenant with this email or domain already exists'
      };
    } else if (error.response?.status === 400) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: error.response.data.errors?.join(', ') || 'Invalid input'
      };
    } else {
      return {
        success: false,
        error: 'UNKNOWN_ERROR',
        message: 'Failed to create tenant. Please try again.'
      };
    }
  }
}
```

### 3. **Form Validation (Frontend)**
```javascript
function validateTenantForm(data) {
  const errors = {};

  // Name validation
  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }
  if (data.name && data.name.length > 200) {
    errors.name = 'Name must be less than 200 characters';
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRegex.test(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  // Subdomain validation (if provided)
  if (data.subdomain) {
    const subdomainRegex = /^[a-z0-9]+$/;
    if (!subdomainRegex.test(data.subdomain)) {
      errors.subdomain = 'Subdomain must contain only lowercase letters and numbers';
    }
  }

  // Plan validation
  const validPlans = ['Trial', 'Basic', 'Professional', 'Enterprise', 'Enterprise Plus'];
  if (data.plan && !validPlans.includes(data.plan)) {
    errors.plan = 'Please select a valid plan';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
```

### 4. **Loading States**
```javascript
const [isCreating, setIsCreating] = useState(false);
const [creationError, setCreationError] = useState(null);

const handleCreate = async () => {
  setIsCreating(true);
  setCreationError(null);

  try {
    const tenant = await createTenant(formData);
    // Success handling
  } catch (error) {
    setCreationError(error.message);
  } finally {
    setIsCreating(false);
  }
};
```

### 5. **Success Handling**
```javascript
// After successful creation
const handleSuccess = (tenant) => {
  // Store tenant info
  localStorage.setItem('currentTenant', JSON.stringify({
    tenantId: tenant.tenantId,
    name: tenant.name,
    domain: tenant.domain
  }));

  // Redirect to tenant dashboard
  window.location.href = `/tenant/${tenant.tenantId}/dashboard`;

  // Or show success message
  showNotification('Tenant created successfully!', 'success');
};
```

---

## 📊 COMPLETE EXAMPLE

### Full React Component

```javascript
import React, { useState } from 'react';
import axios from 'axios';

function TenantCreationForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: 'India',
      pincode: ''
    },
    plan: 'Basic',
    modules: [],
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    language: 'en',
    dateFormat: 'DD/MM/YYYY'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleModuleToggle = (module) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.includes(module)
        ? prev.modules.filter(m => m !== module)
        : [...prev.modules, module]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        'https://api.etelios.com/api/tenants',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setSuccess(true);
        // Redirect or show success
        setTimeout(() => {
          window.location.href = `/tenant/${response.data.data.tenantId}`;
        }, 2000);
      }
    } catch (err) {
      if (err.response?.data) {
        setError(err.response.data.message || 'Failed to create tenant');
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="tenant-form">
      <h2>Create New Tenant</h2>

      {/* Name */}
      <div className="form-group">
        <label>Company Name *</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          minLength={2}
          maxLength={200}
        />
      </div>

      {/* Email */}
      <div className="form-group">
        <label>Email *</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>

      {/* Phone */}
      <div className="form-group">
        <label>Phone</label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
        />
      </div>

      {/* Address */}
      <div className="form-group">
        <label>Street Address</label>
        <input
          type="text"
          name="address.street"
          value={formData.address.street}
          onChange={handleChange}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>City</label>
          <input
            type="text"
            name="address.city"
            value={formData.address.city}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>State</label>
          <input
            type="text"
            name="address.state"
            value={formData.address.state}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Plan */}
      <div className="form-group">
        <label>Subscription Plan</label>
        <select
          name="plan"
          value={formData.plan}
          onChange={handleChange}
        >
          <option value="Trial">Trial</option>
          <option value="Basic">Basic</option>
          <option value="Professional">Professional</option>
          <option value="Enterprise">Enterprise</option>
          <option value="Enterprise Plus">Enterprise Plus</option>
        </select>
      </div>

      {/* Modules */}
      <div className="form-group">
        <label>Modules</label>
        <div className="checkbox-group">
          {['hr', 'crm', 'inventory', 'financial', 'sales', 'purchase', 'analytics', 'reports'].map(module => (
            <label key={module}>
              <input
                type="checkbox"
                checked={formData.modules.includes(module)}
                onChange={() => handleModuleToggle(module)}
              />
              {module.toUpperCase()}
            </label>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="success-message">
          Tenant created successfully! Redirecting...
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="submit-button"
      >
        {loading ? 'Creating Tenant...' : 'Create Tenant'}
      </button>
    </form>
  );
}

export default TenantCreationForm;
```

---

## 🔗 RELATED ENDPOINTS

### Get All Tenants
```http
GET /api/tenants
```

### Get Tenant by ID
```http
GET /api/tenants/:tenantId
```

### Update Tenant
```http
PUT /api/tenants/:tenantId
```

### Delete Tenant
```http
DELETE /api/tenants/:tenantId
```

---

## 📞 SUPPORT

For issues or questions:
- Check API health: `GET https://api.etelios.com/api/tenants/health`
- Review logs: Check tenant-registry-service logs
- API Documentation: See main API docs

---

## ✅ QUICK REFERENCE

### Minimal Request
```json
{
  "name": "Acme Corp",
  "email": "admin@acme.com"
}
```

### Full Request
```json
{
  "name": "Acme Corporation",
  "email": "admin@acme.com",
  "phone": "+91-9876543210",
  "subdomain": "acme",
  "domain": "acme.etelios.com",
  "address": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "pincode": "400001"
  },
  "plan": "Professional",
  "modules": ["hr", "crm", "inventory"],
  "timezone": "Asia/Kolkata",
  "currency": "INR",
  "language": "en",
  "dateFormat": "DD/MM/YYYY"
}
```

---

**✅ Tenant Creation API is ready for frontend integration!**

