# Department Management API - Frontend Developer Guide

> **Complete API Documentation for Department CRUD Operations**  
> Version: 1.0.0  
> Last Updated: January 13, 2026

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base Configuration](#base-configuration)
4. [API Endpoints](#api-endpoints)
   - [Get All Departments](#1-get-all-departments)
   - [Get Department by ID](#2-get-department-by-id)
   - [Create Department](#3-create-department)
   - [Update Department](#4-update-department)
   - [Delete Department](#5-delete-department)
5. [Data Models](#data-models)
6. [Validation Rules](#validation-rules)
7. [Error Handling](#error-handling)
8. [React Integration Examples](#react-integration-examples)
9. [Common Use Cases](#common-use-cases)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Department API allows you to manage organizational departments including creation, retrieval, updating, and deletion. Each department can have a manager, location, budget, and associated employees.

**Base URL:** `http://localhost:3002/api/hr` (Development)  
**Production URL:** `https://your-domain.com/api/hr`

---

## Authentication

All department endpoints require authentication via JWT Bearer token.

### Getting the Token

```javascript
// Login first to get token
const loginResponse = await fetch('http://localhost:3002/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@etelios.com',
    password: 'Admin@123456'
  })
});

const { data } = await loginResponse.json();
const token = data.accessToken;
```

### Using the Token

```javascript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};
```

---

## Base Configuration

### Axios Setup (Recommended)

```javascript
// src/lib/api-client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to all requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

### Fetch Setup

```javascript
// src/lib/fetch-wrapper.ts
export async function fetchApi(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('accessToken');
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}
```

---

## API Endpoints

### 1. Get All Departments

Retrieve a paginated list of all departments.

#### **Endpoint**
```
GET /api/hr/departments
```

#### **Query Parameters**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number for pagination |
| `limit` | number | No | 10 | Number of items per page |
| `search` | string | No | - | Search by department name or code |
| `status` | string | No | - | Filter by status: `active`, `inactive` |

#### **Request Example (JavaScript)**

```javascript
// Using Axios
const getDepartments = async (page = 1, limit = 10, search = '') => {
  try {
    const response = await apiClient.get('/api/hr/departments', {
      params: { page, limit, search }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching departments:', error);
    throw error;
  }
};

// Using Fetch
const getDepartments = async (page = 1, limit = 10) => {
  const url = `http://localhost:3002/api/hr/departments?page=${page}&limit=${limit}`;
  return fetchApi(url);
};
```

#### **Request Example (cURL)**

```bash
curl -X GET "http://localhost:3002/api/hr/departments?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### **Response (200 OK)**

```json
{
  "success": true,
  "message": "Departments retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Human Resources",
      "code": "HR",
      "description": "Manages employee relations and recruitment",
      "head": {
        "_id": "507f1f77bcf86cd799439012",
        "fullName": "John Doe",
        "employeeId": "EMP-2026-001",
        "email": "john.doe@company.com"
      },
      "location": "Building A, Floor 2",
      "phone": "+91-9876543210",
      "email": "hr@company.com",
      "budget": 5000000,
      "status": "active",
      "employeeCount": 15,
      "employees": 15,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Information Technology",
      "code": "IT",
      "description": "Technology infrastructure and support",
      "head": null,
      "location": "Building B, Floor 3",
      "phone": "+91-9876543211",
      "email": "it@company.com",
      "budget": 10000000,
      "status": "active",
      "employeeCount": 25,
      "employees": 25,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 8,
    "pages": 1
  }
}
```

#### **React Component Example**

```typescript
'use client';

import { useState, useEffect } from 'react';

interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
  employeeCount: number;
  status: string;
}

export default function DepartmentList() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchDepartments();
  }, [page]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:3002/api/hr/departments?page=${page}&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        setDepartments(result.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading departments...</div>;

  return (
    <div className="space-y-4">
      {departments.map((dept) => (
        <div key={dept._id} className="p-4 border rounded">
          <h3 className="font-bold">{dept.name} ({dept.code})</h3>
          <p className="text-sm text-gray-600">{dept.description}</p>
          <p className="text-xs">Employees: {dept.employeeCount}</p>
        </div>
      ))}
    </div>
  );
}
```

---

### 2. Get Department by ID

Retrieve a single department by its ID or code.

#### **Endpoint**
```
GET /api/hr/departments/:id
```

#### **URL Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Department ID (MongoDB ObjectId) or Department Code |

#### **Supported ID Formats**

- **MongoDB ObjectId:** `507f1f77bcf86cd799439011`
- **Department Code:** `HR`, `IT`, `dept-1`, `SALES`, etc.

#### **Request Example (JavaScript)**

```javascript
// Using Axios - By ObjectId
const getDepartmentById = async (id: string) => {
  try {
    const response = await apiClient.get(`/api/hr/departments/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching department:', error);
    throw error;
  }
};

// By Department Code
const dept1 = await getDepartmentById('HR');
const dept2 = await getDepartmentById('dept-1');
const dept3 = await getDepartmentById('507f1f77bcf86cd799439011');
```

#### **Request Example (cURL)**

```bash
# By ObjectId
curl -X GET "http://localhost:3002/api/hr/departments/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# By Code
curl -X GET "http://localhost:3002/api/hr/departments/HR" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### **Response (200 OK)**

```json
{
  "success": true,
  "message": "Department retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Human Resources",
    "code": "HR",
    "description": "Manages employee relations, recruitment, and organizational development",
    "head": {
      "_id": "507f1f77bcf86cd799439012",
      "fullName": "John Doe",
      "employeeId": "EMP-2026-001",
      "email": "john.doe@company.com"
    },
    "location": "Building A, Floor 2, Room 201",
    "phone": "+91-9876543210",
    "email": "hr@company.com",
    "budget": 5000000,
    "status": "active",
    "employeeCount": 15,
    "employees": 15,
    "createdBy": "507f1f77bcf86cd799439010",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-20T15:30:00.000Z"
  }
}
```

#### **Response (404 Not Found)**

```json
{
  "success": false,
  "message": "Department not found",
  "error": "Department with ID 'invalid-id' not found"
}
```

---

### 3. Create Department

Create a new department in the system.

#### **Endpoint**
```
POST /api/hr/departments
```

#### **Required Permissions**
- Role: `Admin`, `SuperAdmin`
- Permission: `department:create`

#### **Request Body**

```typescript
interface CreateDepartmentRequest {
  name: string;           // Required, max 100 characters
  code: string;           // Required, unique, max 50 characters, uppercase
  description?: string;   // Optional, max 500 characters
  head?: string;          // Optional, User ObjectId or Employee ID
  location?: string;      // Optional
  phone?: string;         // Optional, format: +XX-XXXXXXXXXX
  email?: string;         // Optional, valid email
  budget?: number;        // Optional, in rupees
  status?: 'active' | 'inactive';  // Optional, default: 'active'
}
```

#### **Field Specifications**

| Field | Type | Required | Constraints | Example |
|-------|------|----------|-------------|---------|
| `name` | string | ✅ Yes | 1-100 chars, unique per tenant | "Human Resources" |
| `code` | string | ✅ Yes | 1-50 chars, unique, uppercase | "HR" |
| `description` | string | No | Max 500 chars | "Manages employee..." |
| `head` | string | No | Valid User ObjectId or Employee ID | "EMP-2026-001" |
| `location` | string | No | Any text | "Building A, Floor 2" |
| `phone` | string | No | Valid phone format | "+91-9876543210" |
| `email` | string | No | Valid email format | "hr@company.com" |
| `budget` | number | No | Positive number | 5000000 |
| `status` | string | No | 'active' or 'inactive' | "active" |

#### **Request Example (JavaScript)**

```javascript
// Using Axios
const createDepartment = async (departmentData) => {
  try {
    const response = await apiClient.post('/api/hr/departments', departmentData);
    return response.data;
  } catch (error) {
    if (error.response?.status === 409) {
      throw new Error('Department name or code already exists');
    }
    throw error;
  }
};

// Example usage
const newDepartment = await createDepartment({
  name: 'Sales & Marketing',
  code: 'SALES',
  description: 'Responsible for sales and marketing activities',
  head: 'EMP-2026-050',
  location: 'Building C, Floor 1',
  phone: '+91-9876543220',
  email: 'sales@company.com',
  budget: 8000000,
  status: 'active'
});
```

#### **Request Example (cURL)**

```bash
curl -X POST "http://localhost:3002/api/hr/departments" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sales & Marketing",
    "code": "SALES",
    "description": "Responsible for sales and marketing activities",
    "head": "EMP-2026-050",
    "location": "Building C, Floor 1",
    "phone": "+91-9876543220",
    "email": "sales@company.com",
    "budget": 8000000,
    "status": "active"
  }'
```

#### **Response (201 Created)**

```json
{
  "success": true,
  "message": "Department created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "name": "Sales & Marketing",
    "code": "SALES",
    "description": "Responsible for sales and marketing activities",
    "head": {
      "_id": "507f1f77bcf86cd799439050",
      "fullName": "Jane Smith",
      "employeeId": "EMP-2026-050",
      "email": "jane.smith@company.com"
    },
    "location": "Building C, Floor 1",
    "phone": "+91-9876543220",
    "email": "sales@company.com",
    "budget": 8000000,
    "status": "active",
    "employeeCount": 0,
    "employees": 0,
    "createdBy": "507f1f77bcf86cd799439010",
    "createdAt": "2024-01-20T16:45:00.000Z",
    "updatedAt": "2024-01-20T16:45:00.000Z"
  }
}
```

#### **Response (400 Bad Request)**

```json
{
  "success": false,
  "message": "Validation failed",
  "error": "Name and code are required"
}
```

#### **Response (409 Conflict)**

```json
{
  "success": false,
  "message": "Duplicate department",
  "error": "Department with this name or code already exists"
}
```

#### **React Form Example**

```typescript
'use client';

import { useState } from 'react';

interface DepartmentFormData {
  name: string;
  code: string;
  description: string;
  location: string;
  phone: string;
  email: string;
  budget: number;
  status: 'active' | 'inactive';
}

export default function CreateDepartmentForm() {
  const [formData, setFormData] = useState<DepartmentFormData>({
    name: '',
    code: '',
    description: '',
    location: '',
    phone: '',
    email: '',
    budget: 0,
    status: 'active',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3002/api/hr/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create department');
      }

      alert('Department created successfully!');
      // Reset form or redirect
      setFormData({
        name: '',
        code: '',
        description: '',
        location: '',
        phone: '',
        email: '',
        budget: 0,
        status: 'active',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'budget' ? Number(value) : value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      <h2 className="text-2xl font-bold">Create Department</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          maxLength={100}
          className="w-full px-3 py-2 border rounded"
          placeholder="Human Resources"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Code <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="code"
          value={formData.code}
          onChange={handleChange}
          required
          maxLength={50}
          className="w-full px-3 py-2 border rounded uppercase"
          placeholder="HR"
          style={{ textTransform: 'uppercase' }}
        />
        <p className="text-xs text-gray-500 mt-1">
          Will be automatically converted to uppercase
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2 border rounded"
          placeholder="Manages employee relations and recruitment"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Location</label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded"
          placeholder="Building A, Floor 2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded"
            placeholder="+91-9876543210"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded"
            placeholder="hr@company.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Budget (₹)</label>
          <input
            type="number"
            name="budget"
            value={formData.budget}
            onChange={handleChange}
            min="0"
            className="w-full px-3 py-2 border rounded"
            placeholder="5000000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Department'}
      </button>
    </form>
  );
}
```

---

### 4. Update Department

Update an existing department's information.

#### **Endpoint**
```
PUT /api/hr/departments/:id
```

#### **Required Permissions**
- Role: `Admin`, `SuperAdmin`
- Permission: `department:update`

#### **URL Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Department ID (ObjectId or Code) |

#### **Request Body**

All fields are optional. Only send the fields you want to update.

```typescript
interface UpdateDepartmentRequest {
  name?: string;
  code?: string;
  description?: string;
  head?: string;
  location?: string;
  phone?: string;
  email?: string;
  budget?: number;
  status?: 'active' | 'inactive';
}
```

#### **Request Example (JavaScript)**

```javascript
// Using Axios
const updateDepartment = async (id: string, updates: Partial<DepartmentFormData>) => {
  try {
    const response = await apiClient.put(`/api/hr/departments/${id}`, updates);
    return response.data;
  } catch (error) {
    console.error('Error updating department:', error);
    throw error;
  }
};

// Example: Update only the name and budget
await updateDepartment('HR', {
  name: 'Human Resources & Development',
  budget: 6000000
});

// Example: Change status to inactive
await updateDepartment('507f1f77bcf86cd799439011', {
  status: 'inactive'
});
```

#### **Request Example (cURL)**

```bash
curl -X PUT "http://localhost:3002/api/hr/departments/HR" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Human Resources & Development",
    "budget": 6000000,
    "phone": "+91-9876543211"
  }'
```

#### **Response (200 OK)**

```json
{
  "success": true,
  "message": "Department updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Human Resources & Development",
    "code": "HR",
    "description": "Manages employee relations, recruitment, and organizational development",
    "head": {
      "_id": "507f1f77bcf86cd799439012",
      "fullName": "John Doe",
      "employeeId": "EMP-2026-001",
      "email": "john.doe@company.com"
    },
    "location": "Building A, Floor 2, Room 201",
    "phone": "+91-9876543211",
    "email": "hr@company.com",
    "budget": 6000000,
    "status": "active",
    "employeeCount": 15,
    "employees": 15,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-21T10:30:00.000Z"
  }
}
```

#### **Response (404 Not Found)**

```json
{
  "success": false,
  "message": "Department not found",
  "error": "Department with ID 'invalid-id' not found"
}
```

#### **Response (409 Conflict)**

```json
{
  "success": false,
  "message": "Duplicate department",
  "error": "Department with this name or code already exists"
}
```

---

### 5. Delete Department

Delete a department from the system.

#### **Endpoint**
```
DELETE /api/hr/departments/:id
```

#### **Required Permissions**
- Role: `Admin`, `SuperAdmin`
- Permission: `department:delete`

#### **URL Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Department ID (ObjectId or Code) |

#### **Important Notes**

⚠️ **Cannot delete department if it has active employees**
- You must reassign all employees to other departments first
- The API will return an error with employee count if deletion is blocked

#### **Request Example (JavaScript)**

```javascript
// Using Axios
const deleteDepartment = async (id: string) => {
  try {
    const response = await apiClient.delete(`/api/hr/departments/${id}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 400) {
      throw new Error('Cannot delete department with active employees');
    }
    throw error;
  }
};

// Example usage
await deleteDepartment('HR');
await deleteDepartment('507f1f77bcf86cd799439011');
```

#### **Request Example (cURL)**

```bash
curl -X DELETE "http://localhost:3002/api/hr/departments/HR" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### **Response (200 OK)**

```json
{
  "success": true,
  "message": "Department deleted successfully",
  "data": null
}
```

#### **Response (400 Bad Request - Has Employees)**

```json
{
  "success": false,
  "message": "Cannot delete department",
  "error": "Department has 15 employees. Please reassign them first."
}
```

#### **Response (404 Not Found)**

```json
{
  "success": false,
  "message": "Department not found",
  "error": "Department with ID 'invalid-id' not found"
}
```

---

## Data Models

### Department Model (TypeScript)

```typescript
interface Department {
  _id: string;                    // MongoDB ObjectId
  name: string;                   // Department name
  code: string;                   // Unique department code (uppercase)
  description?: string;           // Optional description
  head?: {                        // Department head (populated)
    _id: string;
    fullName: string;
    employeeId: string;
    email: string;
  } | string;                     // Can be ObjectId string if not populated
  location?: string;              // Physical location
  phone?: string;                 // Contact phone
  email?: string;                 // Contact email
  budget?: number;                // Annual budget in rupees
  status: 'active' | 'inactive';  // Department status
  employeeCount: number;          // Number of employees (virtual)
  employees: number;              // Alias for employeeCount
  createdBy?: string;             // User who created (ObjectId)
  updatedBy?: string;             // User who last updated (ObjectId)
  createdAt: string;              // ISO date string
  updatedAt: string;              // ISO date string
}

interface DepartmentListResponse {
  success: boolean;
  message: string;
  data: Department[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface DepartmentResponse {
  success: boolean;
  message: string;
  data: Department;
}

interface ErrorResponse {
  success: false;
  message: string;
  error: string;
}
```

---

## Validation Rules

### Field Validation

| Field | Rules |
|-------|-------|
| **name** | Required, 1-100 characters, unique per tenant |
| **code** | Required, 1-50 characters, unique globally, auto-uppercase |
| **description** | Optional, max 500 characters |
| **head** | Optional, must be valid User ObjectId or Employee ID |
| **location** | Optional, any text |
| **phone** | Optional, must match pattern: `/^\+?[\d\s-()]+$/` |
| **email** | Optional, must be valid email format |
| **budget** | Optional, must be positive number |
| **status** | Optional, must be 'active' or 'inactive' |

### Code Transformation

The `code` field is automatically transformed to uppercase:
- Input: `"hr"` → Stored: `"HR"`
- Input: `"dept-1"` → Stored: `"DEPT-1"`

### Unique Constraints

1. **Code** must be globally unique across all tenants
2. **Name** must be unique per tenant
3. Attempting to create/update with duplicate values returns `409 Conflict`

---

## Error Handling

### HTTP Status Codes

| Status | Description | When It Occurs |
|--------|-------------|----------------|
| **200** | OK | Successful GET, PUT, DELETE |
| **201** | Created | Successful POST (department created) |
| **400** | Bad Request | Missing required fields, validation errors |
| **401** | Unauthorized | Missing or invalid authentication token |
| **403** | Forbidden | User doesn't have required permissions |
| **404** | Not Found | Department with given ID doesn't exist |
| **409** | Conflict | Duplicate department name or code |
| **500** | Internal Server Error | Server-side error |

### Error Response Format

All errors follow this format:

```typescript
interface ErrorResponse {
  success: false;
  message: string;  // User-friendly message
  error: string;    // Detailed error description
}
```

### Common Errors

#### 1. Authentication Error (401)
```json
{
  "success": false,
  "message": "Authentication required",
  "error": "No token provided"
}
```

#### 2. Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "Name and code are required"
}
```

#### 3. Duplicate Error (409)
```json
{
  "success": false,
  "message": "Duplicate department",
  "error": "Department with this name or code already exists"
}
```

#### 4. Cannot Delete Error (400)
```json
{
  "success": false,
  "message": "Cannot delete department",
  "error": "Department has 15 employees. Please reassign them first."
}
```

### Error Handling in Code

```typescript
// Using try-catch
const createDepartment = async (data: CreateDepartmentRequest) => {
  try {
    const response = await apiClient.post('/api/hr/departments', data);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      // Server responded with error
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          throw new Error(data.error || 'Validation failed');
        case 401:
          throw new Error('Please login to continue');
        case 403:
          throw new Error('You do not have permission to create departments');
        case 409:
          throw new Error('Department name or code already exists');
        case 500:
          throw new Error('Server error. Please try again later');
        default:
          throw new Error(data.error || 'An error occurred');
      }
    } else if (error.request) {
      // Request made but no response
      throw new Error('Network error. Please check your connection');
    } else {
      // Other errors
      throw new Error('An unexpected error occurred');
    }
  }
};

// Using async/await with proper error display
const handleCreateDepartment = async (formData: DepartmentFormData) => {
  try {
    const result = await createDepartment(formData);
    toast.success('Department created successfully!');
    router.push(`/departments/${result.data._id}`);
  } catch (error: any) {
    toast.error(error.message);
    console.error('Create department error:', error);
  }
};
```

---

## React Integration Examples

### Complete CRUD Example with React Hooks

```typescript
// hooks/useDepartments.ts
import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';

interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
  employeeCount: number;
  status: string;
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all departments
  const fetchDepartments = async (page = 1, limit = 10) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/hr/departments', {
        params: { page, limit }
      });
      setDepartments(response.data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create department
  const createDepartment = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/api/hr/departments', data);
      await fetchDepartments(); // Refresh list
      return response.data.data;
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update department
  const updateDepartment = async (id: string, data: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.put(`/api/hr/departments/${id}`, data);
      await fetchDepartments(); // Refresh list
      return response.data.data;
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete department
  const deleteDepartment = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.delete(`/api/hr/departments/${id}`);
      await fetchDepartments(); // Refresh list
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    departments,
    loading,
    error,
    fetchDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment
  };
}
```

### Usage in Component

```typescript
'use client';

import { useDepartments } from '@/hooks/useDepartments';
import { useEffect } from 'react';

export default function DepartmentsPage() {
  const { 
    departments, 
    loading, 
    error, 
    fetchDepartments,
    deleteDepartment 
  } = useDepartments();

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    
    try {
      await deleteDepartment(id);
      alert('Department deleted successfully!');
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div>
      <h1>Departments</h1>
      <div className="grid gap-4">
        {departments.map(dept => (
          <div key={dept._id} className="border p-4 rounded">
            <h3>{dept.name} ({dept.code})</h3>
            <p>{dept.description}</p>
            <p>Employees: {dept.employeeCount}</p>
            <button 
              onClick={() => handleDelete(dept._id, dept.name)}
              className="text-red-600"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Common Use Cases

### 1. Department Selector Dropdown

```typescript
interface DepartmentSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function DepartmentSelect({ value, onChange }: DepartmentSelectProps) {
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    const response = await fetch('http://localhost:3002/api/hr/departments?limit=100', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      }
    });
    const result = await response.json();
    setDepartments(result.data);
  };

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select Department</option>
      {departments.map(dept => (
        <option key={dept._id} value={dept._id}>
          {dept.name} ({dept.code})
        </option>
      ))}
    </select>
  );
}
```

### 2. Search Departments

```typescript
const [searchTerm, setSearchTerm] = useState('');
const [searchResults, setSearchResults] = useState<Department[]>([]);

const searchDepartments = async (term: string) => {
  if (!term) {
    setSearchResults([]);
    return;
  }

  const response = await fetch(
    `http://localhost:3002/api/hr/departments?search=${encodeURIComponent(term)}`,
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      }
    }
  );
  
  const result = await response.json();
  setSearchResults(result.data);
};

// Debounced search
useEffect(() => {
  const timer = setTimeout(() => {
    searchDepartments(searchTerm);
  }, 300);

  return () => clearTimeout(timer);
}, [searchTerm]);
```

### 3. Filter by Status

```typescript
const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

const fetchFilteredDepartments = async () => {
  const params = new URLSearchParams();
  if (statusFilter !== 'all') {
    params.append('status', statusFilter);
  }

  const response = await fetch(
    `http://localhost:3002/api/hr/departments?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      }
    }
  );
  
  const result = await response.json();
  setDepartments(result.data);
};
```

### 4. Display Department with Employee Count

```typescript
const DepartmentCard = ({ department }: { department: Department }) => (
  <div className="border rounded-lg p-4 shadow-sm">
    <div className="flex justify-between items-start">
      <div>
        <h3 className="text-lg font-semibold">{department.name}</h3>
        <span className="text-sm text-gray-500">Code: {department.code}</span>
      </div>
      <span className={`px-2 py-1 text-xs rounded ${
        department.status === 'active' 
          ? 'bg-green-100 text-green-800' 
          : 'bg-gray-100 text-gray-800'
      }`}>
        {department.status}
      </span>
    </div>
    
    {department.description && (
      <p className="text-sm text-gray-600 mt-2">{department.description}</p>
    )}
    
    <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
      <div className="flex items-center gap-1">
        <UsersIcon className="w-4 h-4" />
        <span>{department.employeeCount} employees</span>
      </div>
      
      {department.location && (
        <div className="flex items-center gap-1">
          <MapPinIcon className="w-4 h-4" />
          <span>{department.location}</span>
        </div>
      )}
    </div>
  </div>
);
```

---

## Troubleshooting

### Issue 1: 404 Error When Using Department Code

**Problem:** `GET /api/hr/departments/HR` returns 404

**Solution:** ✅ Fixed in latest version! The API now supports both ObjectId and code lookup.

```javascript
// These all work now:
await getDepartmentById('HR');               // By code
await getDepartmentById('dept-1');           // By code
await getDepartmentById('507f...439011');    // By ObjectId
```

### Issue 2: 409 Conflict - Duplicate Name

**Problem:** Creating department fails with "Department name already exists"

**Solution:** Each department name must be unique per tenant. Either:
1. Choose a different name
2. Check if department already exists
3. Update the existing department instead

```javascript
// Check if department exists before creating
const checkDepartmentExists = async (name: string) => {
  const response = await fetch(
    `http://localhost:3002/api/hr/departments?search=${name}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  const result = await response.json();
  return result.data.length > 0;
};
```

### Issue 3: Cannot Delete Department

**Problem:** `DELETE /api/hr/departments/:id` returns 400 "Department has employees"

**Solution:** Reassign all employees to other departments first.

```javascript
// 1. Get all employees in department
const employees = await fetch(
  `http://localhost:3002/api/hr/employees?department=${departmentId}`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);

// 2. Reassign each employee
for (const employee of employees.data) {
  await fetch(`http://localhost:3002/api/hr/employees/${employee._id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ department: newDepartmentId })
  });
}

// 3. Now delete department
await deleteDepartment(departmentId);
```

### Issue 4: Token Expired

**Problem:** API returns 401 "Token expired"

**Solution:** Refresh token or re-login

```javascript
// Token refresh logic
const refreshToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  const response = await fetch('http://localhost:3002/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  
  const result = await response.json();
  localStorage.setItem('accessToken', result.data.accessToken);
  return result.data.accessToken;
};

// Use in interceptor
apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      try {
        const newToken = await refreshToken();
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient.request(error.config);
      } catch {
        // Redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

---

## Best Practices

### 1. Use Environment Variables

```typescript
// .env.local
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_API_TIMEOUT=30000
```

```typescript
// lib/api-client.ts
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: Number(process.env.NEXT_PUBLIC_API_TIMEOUT),
});
```

### 2. Implement Loading States

```typescript
const [isCreating, setIsCreating] = useState(false);
const [isUpdating, setIsUpdating] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);

// Disable buttons during operations
<button disabled={isCreating}>
  {isCreating ? 'Creating...' : 'Create Department'}
</button>
```

### 3. Validate Before Submitting

```typescript
const validateForm = (data: DepartmentFormData) => {
  const errors: Record<string, string> = {};

  if (!data.name.trim()) {
    errors.name = 'Name is required';
  } else if (data.name.length > 100) {
    errors.name = 'Name must be less than 100 characters';
  }

  if (!data.code.trim()) {
    errors.code = 'Code is required';
  } else if (data.code.length > 50) {
    errors.code = 'Code must be less than 50 characters';
  }

  if (data.email && !isValidEmail(data.email)) {
    errors.email = 'Invalid email format';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};
```

### 4. Cache Department List

```typescript
import { useQuery } from '@tanstack/react-query';

const useDepartments = () => {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await apiClient.get('/api/hr/departments');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};
```

### 5. Show Confirmation for Delete

```typescript
const handleDelete = async (id: string, name: string) => {
  const confirmed = await showConfirmDialog({
    title: 'Delete Department',
    message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    variant: 'danger'
  });

  if (confirmed) {
    await deleteDepartment(id);
  }
};
```

---

## Summary

### Quick Reference

| Action | Method | Endpoint | Auth Required |
|--------|--------|----------|---------------|
| List all | GET | `/api/hr/departments` | ✅ |
| Get one | GET | `/api/hr/departments/:id` | ✅ |
| Create | POST | `/api/hr/departments` | ✅ Admin |
| Update | PUT | `/api/hr/departments/:id` | ✅ Admin |
| Delete | DELETE | `/api/hr/departments/:id` | ✅ Admin |

### Key Points

1. ✅ All endpoints require JWT authentication
2. ✅ Department ID can be MongoDB ObjectId or department code
3. ✅ Name must be unique per tenant
4. ✅ Code must be globally unique (auto-uppercase)
5. ✅ Cannot delete department with active employees
6. ✅ Status can be 'active' or 'inactive'
7. ✅ Employee count is automatically calculated

### Support

For issues or questions:
- Check error response for details
- Verify token is valid and not expired
- Ensure user has required permissions
- Check console for detailed error logs

---

**Version:** 1.0.0  
**Last Updated:** January 13, 2026  
**Maintained by:** Etelios Backend Team

