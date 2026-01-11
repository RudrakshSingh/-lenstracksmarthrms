# 📋 Departments - Reference Guide

**Status:** ✅ Departments are already created and working!

---

## 📊 Current Departments (8 total)

| ID | Name | Code | Description |
|----|------|------|-------------|
| dept-1 | Sales | SALES | Sales Department |
| dept-2 | IT | TECH | Technology Department |
| dept-3 | HR | HR | Human Resources |
| dept-4 | Accounts | ACCOUNTS | Accounts Department |
| dept-5 | Operations | ECOMMERCE | Operations |
| dept-6 | Lab | LAB | Laboratory |
| dept-7 | Delivery | DELIVERY | Delivery Department |
| dept-8 | Franchise | FRANCHISE | Franchise Department |

---

## 🔌 Department APIs

### Base URL
```
https://98.70.245.87/api/hr/departments
```

### Authentication
All department endpoints require authentication:
```javascript
headers: {
  'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
  'Content-Type': 'application/json'
}
```

---

## 📖 API Endpoints

### 1. Get All Departments
```http
GET /api/hr/departments
```

**Required Roles:** HR, Admin, SuperAdmin, Manager

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "dept-1",
      "name": "Sales",
      "code": "SALES",
      "description": "Sales Department",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "Departments retrieved successfully"
}
```

**Example (JavaScript):**
```javascript
const token = localStorage.getItem('accessToken');

const response = await fetch('https://98.70.245.87/api/hr/departments', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const { data } = await response.json();
console.log('Departments:', data);
```

---

### 2. Get Department by ID
```http
GET /api/hr/departments/:id
```

**Required Roles:** HR, Admin, SuperAdmin, Manager

**Example:**
```bash
curl -X GET "https://98.70.245.87/api/hr/departments/dept-1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "dept-1",
    "name": "Sales",
    "code": "SALES",
    "description": "Sales Department",
    "head": {
      "id": "user-123",
      "name": "John Doe",
      "employeeId": "EMP-001"
    },
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 3. Create Department
```http
POST /api/hr/departments
```

**Required Roles:** Admin, SuperAdmin

**Request Body:**
```json
{
  "name": "Marketing",
  "code": "MKT",
  "description": "Marketing Department",
  "head": "user-id-here",
  "parent_department": "dept-id-here",
  "status": "active"
}
```

**Field Details:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | String | ✅ Yes | Department name (unique) |
| code | String | ✅ Yes | Department code (unique, uppercase) |
| description | String | ❌ No | Department description |
| head | ObjectId | ❌ No | User ID of department head |
| parent_department | ObjectId | ❌ No | Parent department ID (for hierarchy) |
| status | String | ❌ No | 'active' or 'inactive' (default: 'active') |

**Example:**
```javascript
const createDepartment = async (departmentData) => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch('https://98.70.245.87/api/hr/departments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Marketing',
      code: 'MKT',
      description: 'Marketing and Communications',
      status: 'active'
    })
  });
  
  return await response.json();
};
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": "dept-9",
    "name": "Marketing",
    "code": "MKT",
    "description": "Marketing and Communications",
    "status": "active",
    "createdAt": "2026-01-11T20:00:00.000Z"
  },
  "message": "Department created successfully"
}
```

---

### 4. Update Department
```http
PUT /api/hr/departments/:id
```

**Required Roles:** Admin, SuperAdmin

**Request Body:**
```json
{
  "name": "Marketing & Communications",
  "description": "Marketing, Communications, and PR",
  "head": "new-user-id",
  "status": "active"
}
```

**Note:** Only send fields you want to update

**Example:**
```javascript
const updateDepartment = async (deptId, updates) => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch(`https://98.70.245.87/api/hr/departments/${deptId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  
  return await response.json();
};

// Usage
await updateDepartment('dept-1', {
  description: 'Updated description',
  status: 'active'
});
```

---

### 5. Delete Department
```http
DELETE /api/hr/departments/:id
```

**Required Roles:** Admin, SuperAdmin

**Note:** This is a soft delete. The department will be marked as deleted but data will be preserved.

**Example:**
```bash
curl -X DELETE "https://98.70.245.87/api/hr/departments/dept-9" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Department deleted successfully"
}
```

---

## 🎯 Using Departments with Employees

### When Creating an Employee

You can reference a department by name or ID:

**Option 1: By Department Name**
```json
{
  "employeeId": "EMP-001",
  "name": "John Doe",
  "email": "john@example.com",
  "department": "Sales",
  "designation": "Sales Manager"
}
```

**Option 2: By Department Code**
```json
{
  "employeeId": "EMP-001",
  "name": "John Doe",
  "email": "john@example.com",
  "department": "SALES",
  "designation": "Sales Manager"
}
```

---

## 🔍 Filtering Employees by Department

```javascript
// Get all employees in Sales department
const response = await fetch('https://98.70.245.87/api/hr/employees?department=Sales', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data } = await response.json();
```

---

## 📊 Department Hierarchy

Departments support parent-child relationships:

```json
{
  "name": "Sales - North",
  "code": "SALES-N",
  "parent_department": "dept-1",
  "description": "Sales team for North region"
}
```

This creates a hierarchy:
```
Sales (dept-1)
└── Sales - North (dept-10)
```

---

## 🎨 Frontend Integration

### React Example: Department Dropdown

```tsx
import React, { useState, useEffect } from 'react';

function DepartmentDropdown({ value, onChange }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchDepartments = async () => {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch('https://98.70.245.87/api/hr/departments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const { data } = await response.json();
      setDepartments(data);
      setLoading(false);
    };
    
    fetchDepartments();
  }, []);
  
  if (loading) return <div>Loading departments...</div>;
  
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select Department</option>
      {departments.map((dept) => (
        <option key={dept.id} value={dept.name}>
          {dept.name} ({dept.code})
        </option>
      ))}
    </select>
  );
}

export default DepartmentDropdown;
```

---

### React Example: Create Department Form

```tsx
import React, { useState } from 'react';

function CreateDepartmentForm() {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch('https://98.70.245.87/api/hr/departments', {
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
      
      alert('Department created successfully!');
      // Reset form or redirect
      
    } catch (err) {
      setError('Failed to create department');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <h2>Create Department</h2>
      
      {error && <div className="error">{error}</div>}
      
      <div>
        <label>Department Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      
      <div>
        <label>Department Code *</label>
        <input
          type="text"
          value={formData.code}
          onChange={(e) => setFormData({ 
            ...formData, 
            code: e.target.value.toUpperCase() 
          })}
          required
          placeholder="e.g., MKT"
        />
      </div>
      
      <div>
        <label>Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Department'}
      </button>
    </form>
  );
}

export default CreateDepartmentForm;
```

---

## 🔐 Permissions Required

| Action | Roles | Permission |
|--------|-------|------------|
| **Read** (List/View) | HR, Admin, SuperAdmin, Manager | `department:read` |
| **Create** | Admin, SuperAdmin | `department:create` |
| **Update** | Admin, SuperAdmin | `department:update` |
| **Delete** | Admin, SuperAdmin | `department:delete` |

---

## ✅ Quick Test

Test if departments are working:

```bash
# Get all departments
curl -X GET "https://98.70.245.87/api/hr/departments" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: List of 8 departments
```

---

## 📝 Summary

✅ **Departments Already Created:** 8 departments exist  
✅ **Full CRUD APIs:** Available  
✅ **Working:** All endpoints tested  
✅ **Employee Integration:** Can assign departments to employees  
✅ **Filtering:** Can filter employees by department  
✅ **Hierarchy Support:** Parent-child relationships supported  

---

**Status:** 🟢 **FULLY FUNCTIONAL**

No action needed - departments are ready to use!

---

## 🎯 Common Use Cases

### 1. Create New Employee with Department
```javascript
await fetch('https://98.70.245.87/api/hr/employees', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    employeeId: 'EMP-123',
    name: 'John Doe',
    email: 'john@example.com',
    department: 'Sales',  // Use department name
    designation: 'Sales Executive'
  })
});
```

### 2. Get All Sales Employees
```javascript
const salesEmployees = await fetch(
  'https://98.70.245.87/api/hr/employees?department=Sales',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
```

### 3. Update Employee Department
```javascript
await fetch(`https://98.70.245.87/api/hr/employees/${employeeId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    department: 'IT'  // Transfer to IT department
  })
});
```

---

**For complete API documentation, see:**
- `COMPLETE_SYSTEM_DOCUMENTATION.md`
- `FRONTEND_STORE_API_DOCUMENTATION.md`
