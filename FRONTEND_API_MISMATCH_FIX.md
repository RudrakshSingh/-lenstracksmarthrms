# 🔧 Frontend API Mismatch - Complete Fix Guide

## ❌ Current Issue

**Frontend is calling**: `localhost:3002/api/employees`  
**Backend expects**: `https://98.70.245.87/api/hr/employees`

**Errors:**
- 503 Service Unavailable (wrong host)
- 404 Not Found (wrong path)

---

## ✅ Complete Fix for Frontend Developer

### 1. Update API Base URL

**Current (Wrong):**
```typescript
// Frontend config
const API_BASE_URL = 'http://localhost:3002';
```

**Should Be:**
```typescript
// Frontend config
const API_BASE_URL = 'https://98.70.245.87';
```

---

### 2. Update API Endpoints

The backend uses `/api/hr/` prefix for HR-related endpoints, not just `/api/`.

#### ❌ Wrong Endpoints:
```typescript
POST /api/employees                    // ❌ 404 Not Found
GET  /api/employees                    // ❌ 404 Not Found
PUT  /api/employees/{id}               // ❌ 404 Not Found
POST /api/employees/{id}/assign-role   // ❌ 404 Not Found
PATCH /api/employees/{id}/status       // ❌ 404 Not Found
```

#### ✅ Correct Endpoints:
```typescript
POST /api/hr/employees                    // ✅ Works
GET  /api/hr/employees                    // ✅ Works
PUT  /api/hr/employees/{id}               // ✅ Works
POST /api/hr/employees/{id}/assign-role   // ✅ Works
PATCH /api/hr/employees/{id}/status       // ✅ Works
```

---

## 📝 Complete API Endpoint Mapping

### **Authentication APIs** (Auth Service)
```typescript
// Base: /api/auth
POST   /api/auth/login              // Login
POST   /api/auth/register           // Register user
POST   /api/auth/mock-login         // Mock login (testing)
GET    /api/auth/profile            // Get profile
POST   /api/auth/logout             // Logout
POST   /api/auth/refresh-token      // Refresh token
```

### **Employee APIs** (HR Service)
```typescript
// Base: /api/hr
GET    /api/hr/employees            // Get all employees
POST   /api/hr/employees            // Create employee
GET    /api/hr/employees/:id        // Get employee by ID
PUT    /api/hr/employees/:id        // Update employee
DELETE /api/hr/employees/:id        // Delete employee
POST   /api/hr/employees/:id/assign-role   // Assign role
PATCH  /api/hr/employees/:id/status        // Update status
```

### **Onboarding APIs** (HR Service)
```typescript
// Base: /api/hr
POST   /api/hr/onboarding           // Create onboarding
GET    /api/hr/onboarding/:id       // Get onboarding
PUT    /api/hr/onboarding/:id/work-details    // Update work details
PUT    /api/hr/onboarding/:id/statutory       // Update statutory
POST   /api/hr/onboarding/:id/complete        // Complete onboarding
GET    /api/hr/onboarding/drafts              // Get drafts
```

### **Department APIs** (HR Service)
```typescript
// Base: /api/hr
GET    /api/hr/departments          // Get all departments
```

### **Store APIs** (HR Service)
```typescript
// Base: /api/hr
GET    /api/hr/stores               // Get all stores
POST   /api/hr/stores               // Create store
GET    /api/hr/stores/:id           // Get store by ID
PUT    /api/hr/stores/:id           // Update store
DELETE /api/hr/stores/:id           // Delete store
```

### **Document APIs** (Document Service - Not Deployed Yet)
```typescript
// Base: /api/documents (when deployed)
POST   /api/documents/upload        // Upload document
GET    /api/documents/:id           // Get document
DELETE /api/documents/:id           // Delete document
```

---

## 🔧 Frontend Code Changes Required

### File 1: API Configuration (`lib/api-config.ts` or `config/api.ts`)

```typescript
// ❌ OLD:
const API_CONFIG = {
  baseURL: 'http://localhost:3002',
  endpoints: {
    employees: '/api/employees',           // ❌ Wrong
    departments: '/api/departments',       // ❌ Wrong
    onboarding: '/api/onboarding',         // ❌ Wrong
  }
};

// ✅ NEW:
const API_CONFIG = {
  baseURL: 'https://98.70.245.87',
  endpoints: {
    // Auth Service
    auth: {
      login: '/api/auth/login',
      register: '/api/auth/register',
      mockLogin: '/api/auth/mock-login',
      profile: '/api/auth/profile',
    },
    // HR Service
    hr: {
      employees: '/api/hr/employees',           // ✅ Correct
      departments: '/api/hr/departments',       // ✅ Correct
      onboarding: '/api/hr/onboarding',         // ✅ Correct
      stores: '/api/hr/stores',                 // ✅ Correct
      leave: '/api/hr/leave',                   // ✅ Correct
      transfers: '/api/transfers',              // ✅ Correct
      hrLetters: '/api/hr-letter',              // ✅ Correct
    },
    // Attendance Service
    attendance: {
      clockIn: '/api/attendance/clock-in',
      clockOut: '/api/attendance/clock-out',
      history: '/api/attendance/history',
      geofencing: '/api/geofencing/zones',
    },
    // Documents (when deployed)
    documents: {
      upload: '/api/documents/upload',
      get: '/api/documents',
    }
  }
};

export default API_CONFIG;
```

---

### File 2: Employee API Client (`services/employee-api.ts` or similar)

```typescript
import API_CONFIG from '@/lib/api-config';

// ❌ OLD:
export const getEmployees = async (params) => {
  return fetch(`${API_CONFIG.baseURL}/api/employees`, { ... });
};

// ✅ NEW:
export const getEmployees = async (params) => {
  return fetch(`${API_CONFIG.baseURL}/api/hr/employees`, { ... });
};

// ❌ OLD:
export const createEmployee = async (data) => {
  return fetch(`${API_CONFIG.baseURL}/api/employees`, {
    method: 'POST',
    ...
  });
};

// ✅ NEW:
export const createEmployee = async (data) => {
  return fetch(`${API_CONFIG.baseURL}/api/hr/employees`, {
    method: 'POST',
    ...
  });
};

// ❌ OLD:
export const assignRole = async (employeeId, roleName) => {
  return fetch(`${API_CONFIG.baseURL}/api/employees/${employeeId}/assign-role`, {
    method: 'POST',
    ...
  });
};

// ✅ NEW:
export const assignRole = async (employeeId, roleName) => {
  return fetch(`${API_CONFIG.baseURL}/api/hr/employees/${employeeId}/assign-role`, {
    method: 'POST',
    ...
  });
};

// ❌ OLD:
export const updateStatus = async (employeeId, status) => {
  return fetch(`${API_CONFIG.baseURL}/api/employees/${employeeId}/status`, {
    method: 'PATCH',
    ...
  });
};

// ✅ NEW:
export const updateStatus = async (employeeId, status) => {
  return fetch(`${API_CONFIG.baseURL}/api/hr/employees/${employeeId}/status`, {
    method: 'PATCH',
    ...
  });
};
```

---

### File 3: Onboarding API Client (`services/onboarding-api.ts`)

```typescript
import API_CONFIG from '@/lib/api-config';

// ❌ OLD:
export const getDepartments = async () => {
  return fetch(`${API_CONFIG.baseURL}/api/departments`);
};

// ✅ NEW:
export const getDepartments = async () => {
  return fetch(`${API_CONFIG.baseURL}/api/hr/departments`);
};

// ❌ OLD:
export const saveDraft = async (step, data) => {
  return fetch(`${API_CONFIG.baseURL}/api/onboarding/draft`, {
    method: 'POST',
    ...
  });
};

// ✅ NEW:
export const saveDraft = async (step, data) => {
  return fetch(`${API_CONFIG.baseURL}/api/hr/onboarding/draft`, {
    method: 'POST',
    ...
  });
};
```

---

## 🎯 Quick Fix Summary

### Change These URLs:

| Old URL (Wrong) | New URL (Correct) |
|-----------------|-------------------|
| `localhost:3002` | `https://98.70.245.87` |
| `/api/employees` | `/api/hr/employees` |
| `/api/departments` | `/api/hr/departments` |
| `/api/onboarding` | `/api/hr/onboarding` |
| `/api/documents` | `/api/documents` (when deployed) |

---

## 🧪 Test After Changes

### Test 1: Get Employees
```javascript
// Get mock login token first
const loginRes = await fetch('https://98.70.245.87/api/auth/mock-login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({role: 'admin'})
});
const {accessToken} = (await loginRes.json()).data;

// Now test employees endpoint
const empRes = await fetch('https://98.70.245.87/api/hr/employees', {
  headers: {'Authorization': `Bearer ${accessToken}`}
});
console.log(await empRes.json());
```

### Test 2: Create Employee
```javascript
const createRes = await fetch('https://98.70.245.87/api/hr/employees', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    employeeId: 'EMP-2025-001',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: 'Test@123',
    roleName: 'employee',
    phone: '9876543210',
    department: 'Sales',
    jobTitle: 'Sales Executive'
  })
});
console.log(await createRes.json());
```

---

## 📋 Complete Corrected API List

### **Step 1: Basic Information**
```typescript
// Register employee
POST https://98.70.245.87/api/auth/register
```

### **Step 2: Work Details**
```typescript
// Get departments
GET https://98.70.245.87/api/hr/departments

// Get employees (for manager selection)
GET https://98.70.245.87/api/hr/employees?status=active

// Create employee
POST https://98.70.245.87/api/hr/employees
```

### **Step 3: Statutory Info**
```typescript
// Update employee
PUT https://98.70.245.87/api/hr/employees/{employeeId}
```

### **Step 4: Documents**
```typescript
// Upload document (Document service - not deployed yet)
// Temporary: Store in employee record or skip
POST https://98.70.245.87/api/documents/upload
```

### **Step 5: Complete Onboarding**
```typescript
// Assign role
POST https://98.70.245.87/api/hr/employees/{employeeId}/assign-role

// Update status
PATCH https://98.70.245.87/api/hr/employees/{employeeId}/status
```

---

## ⚠️ Document Service Issue

**Problem**: Document service is **not deployed** yet, so document uploads will fail.

**Temporary Solutions:**

### Option 1: Skip Documents (Recommended for now)
```typescript
// In onboarding flow, make documents optional
if (documentsUploaded.length > 0) {
  try {
    await uploadDocuments();
  } catch (error) {
    console.warn('Document upload skipped - service not deployed');
  }
}
```

### Option 2: Store Document Info in Employee Record
```typescript
// Store document metadata in employee record
PUT /api/hr/employees/{employeeId}
{
  documents: [
    {
      type: 'AADHAR',
      fileName: 'aadhar.pdf',
      status: 'pending_upload'
    }
  ]
}
```

### Option 3: Deploy Document Service
I can deploy the document service if needed.

---

## 🔐 Authentication Token

Make sure the frontend is sending the token correctly:

```typescript
// Get token from mock login
const loginResponse = await fetch('https://98.70.245.87/api/auth/mock-login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    role: 'admin',
    email: 'admin@test.com',
    name: 'Test Admin'
  })
});

const { accessToken } = (await loginResponse.json()).data;

// Store token
localStorage.setItem('accessToken', accessToken);

// Use token in all subsequent requests
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
};
```

---

## 📝 Complete Frontend API Client Example

```typescript
// lib/api-client.ts
const API_BASE_URL = 'https://98.70.245.87';

const getAuthToken = () => {
  return localStorage.getItem('accessToken') || 
         sessionStorage.getItem('accessToken');
};

const apiClient = {
  // Auth APIs
  auth: {
    mockLogin: async (role: string) => {
      const res = await fetch(`${API_BASE_URL}/api/auth/mock-login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({role})
      });
      return res.json();
    },
    
    login: async (emailOrEmployeeId: string, password: string) => {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({emailOrEmployeeId, password})
      });
      return res.json();
    },
    
    register: async (userData: any) => {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      return res.json();
    }
  },
  
  // HR APIs
  hr: {
    // Employees
    getEmployees: async (params?: any) => {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE_URL}/api/hr/employees?${query}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      return res.json();
    },
    
    createEmployee: async (employeeData: any) => {
      const res = await fetch(`${API_BASE_URL}/api/hr/employees`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(employeeData)
      });
      return res.json();
    },
    
    updateEmployee: async (employeeId: string, data: any) => {
      const res = await fetch(`${API_BASE_URL}/api/hr/employees/${employeeId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      return res.json();
    },
    
    assignRole: async (employeeId: string, roleName: string) => {
      const res = await fetch(`${API_BASE_URL}/api/hr/employees/${employeeId}/assign-role`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({roleName})
      });
      return res.json();
    },
    
    updateStatus: async (employeeId: string, status: string) => {
      const res = await fetch(`${API_BASE_URL}/api/hr/employees/${employeeId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({status})
      });
      return res.json();
    },
    
    // Departments
    getDepartments: async () => {
      const res = await fetch(`${API_BASE_URL}/api/hr/departments`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      return res.json();
    },
    
    // Stores
    getStores: async () => {
      const res = await fetch(`${API_BASE_URL}/api/hr/stores`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      return res.json();
    }
  },
  
  // Attendance APIs
  attendance: {
    clockIn: async (data: any) => {
      const res = await fetch(`${API_BASE_URL}/api/attendance/clock-in`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      return res.json();
    }
  }
};

export default apiClient;
```

---

## 🔄 Updated Onboarding Flow

```typescript
// Step 1: Register employee
const registerRes = await apiClient.auth.register({
  employee_id: 'EMP-2025-001',
  name: 'Rajesh Kumar',
  email: 'rajesh@test.com',
  phone: '9876543210',
  password: 'Temp@123',
  role: 'employee',
  department: 'Sales',
  designation: 'Sales Executive',
  joining_date: '2025-01-01'
});

// Step 2: Create employee record
const createRes = await apiClient.hr.createEmployee({
  employeeId: 'EMP-2025-001',
  firstName: 'Rajesh',
  lastName: 'Kumar',
  email: 'rajesh@test.com',
  password: 'Temp@123',
  roleName: 'employee',
  phone: '9876543210',
  department: 'Sales',
  jobTitle: 'Sales Executive'
});

// Step 3: Update statutory info
const updateRes = await apiClient.hr.updateEmployee('EMP-2025-001', {
  uan: '123456789012',
  panNumber: 'ABCDE1234F',
  bankAccount: {
    account_number: '1234567890',
    ifsc_code: 'HDFC0001234',
    bank_name: 'HDFC Bank',
    account_type: 'Savings'
  }
});

// Step 4: Skip documents for now (service not deployed)
console.log('Documents upload skipped - service not deployed');

// Step 5: Assign role
const roleRes = await apiClient.hr.assignRole('EMP-2025-001', 'employee');

// Step 6: Update status
const statusRes = await apiClient.hr.updateStatus('EMP-2025-001', 'active');
```

---

## ✅ Checklist for Frontend Developer

### Immediate Fixes:
- [ ] Change `localhost:3002` to `https://98.70.245.87`
- [ ] Change `/api/employees` to `/api/hr/employees`
- [ ] Change `/api/departments` to `/api/hr/departments`
- [ ] Change `/api/onboarding` to `/api/hr/onboarding`
- [ ] Add `/api/hr/` prefix to all HR-related endpoints
- [ ] Accept SSL certificate in browser (visit `https://98.70.245.87`)
- [ ] Test mock login first
- [ ] Verify token is being sent in Authorization header

### Document Handling:
- [ ] Make document upload optional (service not deployed)
- [ ] Show warning: "Document service not available"
- [ ] Continue onboarding without documents
- [ ] Or deploy document service (let me know)

### Testing:
- [ ] Test mock login
- [ ] Test get employees
- [ ] Test create employee
- [ ] Test assign role
- [ ] Test update status
- [ ] Verify complete onboarding flow

---

## 🆘 Still Getting 503?

If still getting 503 after these changes:

1. **Check browser console** for exact URL being called
2. **Verify** it's `https://98.70.245.87/api/hr/...` not `localhost`
3. **Check Network tab** to see actual request
4. **Verify token** is included in Authorization header
5. **Accept SSL certificate** by visiting `https://98.70.245.87` first

---

## 📞 Quick Test Commands

```bash
# Test mock login
curl -k -X POST https://98.70.245.87/api/auth/mock-login \
  -H 'Content-Type: application/json' \
  -d '{"role":"admin"}'

# Test get employees (use token from above)
curl -k https://98.70.245.87/api/hr/employees \
  -H 'Authorization: Bearer <your-token>'

# Test create employee
curl -k -X POST https://98.70.245.87/api/hr/employees \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Content-Type: application/json' \
  -d '{"employeeId":"EMP-TEST-001","firstName":"Test","lastName":"User","email":"test@test.com","password":"Test@123","roleName":"employee"}'
```

---

## 🎉 After Fix

Once these changes are made:
- ✅ 503 errors will be gone
- ✅ Employee creation will work
- ✅ Statutory info update will work
- ✅ Role assignment will work
- ✅ Status update will work
- ⚠️ Document upload will still fail (service not deployed)

---

**Send this document to your frontend developer for immediate fixes!**

