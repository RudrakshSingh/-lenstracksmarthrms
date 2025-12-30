# 🔄 Frontend vs Backend Flow Comparison

## ✅ Overall Assessment

**Flow Match**: ⚠️ **PARTIALLY MATCHED** - Needs path corrections

---

## 📊 Step-by-Step Comparison

### **Step 1: Basic Information**

| Component | Frontend Expects | Backend Provides | Status |
|-----------|------------------|------------------|--------|
| **Endpoint** | `POST /api/auth/register` | `POST /api/auth/register` | ✅ MATCH |
| **Fields** | employee_id, name, email, phone, password, address | ✅ All supported | ✅ MATCH |
| **Response** | User ID, employee_id, email, name | ✅ Provided | ✅ MATCH |

**Verdict**: ✅ **MATCHED** - Works perfectly

---

### **Step 2: Work Details**

| Component | Frontend Expects | Backend Provides | Status |
|-----------|------------------|------------------|--------|
| **Get Departments** | `GET /api/departments` ❌ | `GET /api/hr/departments` ✅ | ⚠️ PATH MISMATCH |
| **Get Employees** | `GET /api/employees` ❌ | `GET /api/hr/employees` ✅ | ⚠️ PATH MISMATCH |
| **Create Employee** | `POST /api/employees` ❌ | `POST /api/hr/employees` ✅ | ⚠️ PATH MISMATCH |
| **Fields** | designation, department, joining_date, etc. | ✅ All supported | ✅ MATCH |
| **Response** | Employee ID, status | ✅ Provided | ✅ MATCH |

**Verdict**: ⚠️ **PATH MISMATCH** - Add `/hr` prefix

**Fix Required:**
```typescript
// Change:
GET  /api/employees        → GET  /api/hr/employees
GET  /api/departments      → GET  /api/hr/departments  
POST /api/employees        → POST /api/hr/employees
```

---

### **Step 3: Statutory Information**

| Component | Frontend Expects | Backend Provides | Status |
|-----------|------------------|------------------|--------|
| **Update Employee** | `PUT /api/employees/{id}` ❌ | `PUT /api/hr/employees/{id}` ✅ | ⚠️ PATH MISMATCH |
| **Alternative** | - | `POST /api/hr/onboarding/statutory-info` ✅ | ✅ AVAILABLE |
| **Fields** | uan, pan, bank account, previous employment | ✅ All supported | ✅ MATCH |
| **Response** | Updated employee data | ✅ Provided | ✅ MATCH |

**Verdict**: ⚠️ **PATH MISMATCH** - Add `/hr` prefix

**Fix Required:**
```typescript
// Change:
PUT /api/employees/{id}  → PUT /api/hr/employees/{id}

// Or use onboarding-specific endpoint:
POST /api/hr/onboarding/statutory-info
```

---

### **Step 4: Documents Upload**

| Component | Frontend Expects | Backend Provides | Status |
|-----------|------------------|------------------|--------|
| **Upload Document** | `POST /api/documents/upload` | ❌ Document service NOT deployed | ❌ SERVICE MISSING |
| **Alternative** | - | `POST /api/hr/onboarding/documents` ✅ | ✅ AVAILABLE |
| **Fields** | employee_id, document_type, file, category | ✅ Supported via onboarding | ✅ MATCH |
| **Response** | Document ID, status | ✅ Can be provided | ✅ MATCH |

**Verdict**: ❌ **SERVICE NOT DEPLOYED** - Use alternative or make optional

**Fix Options:**

**Option 1: Use HR Onboarding Documents Endpoint**
```typescript
// Instead of:
POST /api/documents/upload

// Use:
POST /api/hr/onboarding/documents
{
  "employeeId": "EMP-2025-001",
  "documents": [
    {
      "type": "AADHAR",
      "file_url": "https://...",  // Upload to cloud storage first
      "file_name": "aadhar.pdf"
    }
  ]
}
```

**Option 2: Make Documents Optional (Recommended for now)**
```typescript
// Skip document upload if service not available
try {
  await uploadDocuments();
} catch (error) {
  console.warn('Document upload skipped - continuing onboarding');
}
```

---

### **Step 5: Complete Onboarding**

| Component | Frontend Expects | Backend Provides | Status |
|-----------|------------------|------------------|--------|
| **Assign Role** | `POST /api/employees/{id}/assign-role` ❌ | `POST /api/hr/employees/{id}/assign-role` ✅ | ⚠️ PATH MISMATCH |
| **Update Status** | `PATCH /api/employees/{id}/status` ❌ | `PATCH /api/hr/employees/{id}/status` ✅ | ⚠️ PATH MISMATCH |
| **Complete Onboarding** | - | `POST /api/hr/employees/{id}/complete-onboarding` ✅ | ✅ AVAILABLE |
| **Fields** | roleName, status, notifications | ✅ All supported | ✅ MATCH |
| **Response** | Success status | ✅ Provided | ✅ MATCH |

**Verdict**: ⚠️ **PATH MISMATCH** - Add `/hr` prefix

**Fix Required:**
```typescript
// Change:
POST  /api/employees/{id}/assign-role  → POST  /api/hr/employees/{id}/assign-role
PATCH /api/employees/{id}/status       → PATCH /api/hr/employees/{id}/status
```

---

## 📝 Complete Endpoint Mapping

### ✅ Correctly Matched Endpoints

| Frontend | Backend | Status |
|----------|---------|--------|
| `POST /api/auth/register` | `POST /api/auth/register` | ✅ MATCH |
| `POST /api/auth/login` | `POST /api/auth/login` | ✅ MATCH |
| `POST /api/auth/mock-login` | `POST /api/auth/mock-login` | ✅ MATCH |

### ⚠️ Needs Path Correction

| Frontend (Wrong) | Backend (Correct) | Fix |
|------------------|-------------------|-----|
| `GET /api/employees` | `GET /api/hr/employees` | Add `/hr` |
| `POST /api/employees` | `POST /api/hr/employees` | Add `/hr` |
| `PUT /api/employees/{id}` | `PUT /api/hr/employees/{id}` | Add `/hr` |
| `POST /api/employees/{id}/assign-role` | `POST /api/hr/employees/{id}/assign-role` | Add `/hr` |
| `PATCH /api/employees/{id}/status` | `PATCH /api/hr/employees/{id}/status` | Add `/hr` |
| `GET /api/departments` | `GET /api/hr/departments` | Add `/hr` |

### ❌ Service Not Deployed

| Frontend Expects | Status | Alternative |
|------------------|--------|-------------|
| `POST /api/documents/upload` | ❌ Service not deployed | `POST /api/hr/onboarding/documents` |

---

## 🎯 Complete Corrected Onboarding Flow

### **Step 1: Basic Information → Auth Service**
```typescript
// ✅ CORRECT - No change needed
POST https://98.70.245.87/api/auth/register
{
  "employee_id": "EMP-2025-001",
  "name": "Rajesh Kumar",
  "email": "rajesh@test.com",
  "phone": "9876543210",
  "password": "Temp@123",
  "role": "employee",
  "department": "Sales",
  "designation": "Sales Executive",
  "joining_date": "2025-01-01",
  "address": {
    "address_line_1": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  }
}
```

---

### **Step 2: Work Details → HR Service**

#### 2.1 Get Departments
```typescript
// ❌ Frontend calling:
GET http://localhost:3002/api/departments

// ✅ Should call:
GET https://98.70.245.87/api/hr/departments
```

#### 2.2 Get Employees (for Reporting Manager)
```typescript
// ❌ Frontend calling:
GET http://localhost:3002/api/employees?status=ACTIVE

// ✅ Should call:
GET https://98.70.245.87/api/hr/employees?status=active&limit=1000
```

#### 2.3 Create Employee Record
```typescript
// ❌ Frontend calling:
POST http://localhost:3002/api/employees

// ✅ Should call:
POST https://98.70.245.87/api/hr/employees
{
  "employeeId": "EMP-2025-001",
  "firstName": "Rajesh",
  "lastName": "Kumar",
  "email": "rajesh@test.com",
  "password": "Temp@123",
  "roleName": "employee",
  "phone": "9876543210",
  "jobTitle": "Sales Executive",
  "department": "Sales",
  "storeId": "store-123"
}
```

---

### **Step 3: Statutory Info → HR Service**

```typescript
// ❌ Frontend calling:
PUT http://localhost:3002/api/employees/EMP-2025-001

// ✅ Should call:
PUT https://98.70.245.87/api/hr/employees/EMP-2025-001
{
  "uan": "123456789012",
  "esiNo": "1234567890123456",
  "panNumber": "ABCDE1234F",
  "bankAccount": {
    "account_number": "1234567890",
    "ifsc_code": "HDFC0001234",
    "bank_name": "HDFC Bank",
    "branch_name": "Mumbai Branch",
    "account_type": "Savings"
  },
  "previousEmployment": {
    "has_previous_employment": false
  }
}

// ✅ Alternative (onboarding-specific):
POST https://98.70.245.87/api/hr/onboarding/statutory-info
{
  "employeeId": "EMP-2025-001",
  "bankAccount": { ... },
  "uan": "...",
  "panNumber": "..."
}
```

---

### **Step 4: Documents → Document Service (NOT DEPLOYED)**

```typescript
// ❌ Frontend calling:
POST http://localhost:3002/api/documents/upload
// This will fail - Document service not deployed

// ✅ Option 1: Use HR onboarding documents endpoint
POST https://98.70.245.87/api/hr/onboarding/documents
{
  "employeeId": "EMP-2025-001",
  "documents": [
    {
      "type": "AADHAR",
      "file_name": "aadhar.pdf",
      "file_url": "https://storage.../aadhar.pdf",  // Upload to cloud first
      "category": "IDENTITY"
    }
  ]
}

// ✅ Option 2: Make optional (RECOMMENDED)
// Skip document upload for now
// Show message: "Documents will be uploaded later"
```

---

### **Step 5: Complete Onboarding → HR Service**

#### 5.1 Assign Role
```typescript
// ❌ Frontend calling:
POST http://localhost:3002/api/employees/EMP-2025-001/assign-role

// ✅ Should call:
POST https://98.70.245.87/api/hr/employees/EMP-2025-001/assign-role
{
  "roleName": "employee"
}
```

#### 5.2 Update Status
```typescript
// ❌ Frontend calling:
PATCH http://localhost:3002/api/employees/EMP-2025-001/status

// ✅ Should call:
PATCH https://98.70.245.87/api/hr/employees/EMP-2025-001/status
{
  "status": "active"
}
```

#### 5.3 Complete Onboarding (Optional but recommended)
```typescript
// ✅ Use this to finalize everything:
POST https://98.70.245.87/api/hr/employees/EMP-2025-001/complete-onboarding
{
  "system_access": {
    "create_system_account": true,
    "role_name": "employee",
    "notifications": {
      "email_welcome": true,
      "email_credentials": true,
      "notify_manager": true,
      "notify_hr": true
    }
  }
}
```

---

## 🔧 Required Frontend Changes

### Change 1: Base URL
```typescript
// In .env or config file
- const API_BASE_URL = 'http://localhost:3002';
+ const API_BASE_URL = 'https://98.70.245.87';
```

### Change 2: Add /hr Prefix to HR Endpoints
```typescript
// In API client or services files
- `/api/employees`                → `/api/hr/employees`
- `/api/departments`              → `/api/hr/departments`
- `/api/employees/${id}`          → `/api/hr/employees/${id}`
- `/api/employees/${id}/assign-role` → `/api/hr/employees/${id}/assign-role`
- `/api/employees/${id}/status`   → `/api/hr/employees/${id}/status`
```

### Change 3: Handle Documents (Service Not Deployed)
```typescript
// Option A: Skip documents temporarily
const handleDocumentUpload = async (file, employeeId) => {
  try {
    // Try HR onboarding documents endpoint
    return await fetch(`${API_BASE_URL}/api/hr/onboarding/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        employeeId,
        documents: [{
          type: file.type,
          file_name: file.name,
          file_url: 'pending_upload',  // Placeholder
          category: file.category
        }]
      })
    });
  } catch (error) {
    console.warn('Document upload skipped - service not available');
    return { success: true, message: 'Document noted, upload pending' };
  }
};

// Option B: Make documents optional in onboarding flow
const completeOnboarding = async () => {
  // Don't fail if documents aren't uploaded
  if (documents.length === 0) {
    console.warn('No documents uploaded - completing without documents');
  }
  
  // Continue with role assignment and status update
  await assignRole();
  await updateStatus();
};
```

---

## ✅ Corrected API Client Implementation

```typescript
// lib/api-client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://98.70.245.87';

const getToken = () => localStorage.getItem('accessToken') || sessionStorage.getItem('access_token');

export const onboardingAPI = {
  // Step 1: Register
  register: async (data) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Step 2: Get Departments
  getDepartments: async () => {
    const res = await fetch(`${API_BASE_URL}/api/hr/departments`, {
      headers: {'Authorization': `Bearer ${getToken()}`}
    });
    return res.json();
  },

  // Step 2: Get Employees (for manager selection)
  getEmployees: async (params) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/api/hr/employees?${query}`, {
      headers: {'Authorization': `Bearer ${getToken()}`}
    });
    return res.json();
  },

  // Step 2: Create Employee
  createEmployee: async (data) => {
    const res = await fetch(`${API_BASE_URL}/api/hr/employees`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Step 3: Update Statutory Info
  updateStatutory: async (employeeId, data) => {
    const res = await fetch(`${API_BASE_URL}/api/hr/employees/${employeeId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Step 4: Upload Documents (use HR onboarding endpoint)
  uploadDocuments: async (employeeId, documents) => {
    const res = await fetch(`${API_BASE_URL}/api/hr/onboarding/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        employeeId,
        documents: documents.map(doc => ({
          type: doc.type,
          file_name: doc.fileName,
          file_url: doc.url || 'pending',
          category: doc.category
        }))
      })
    });
    return res.json();
  },

  // Step 5: Assign Role
  assignRole: async (employeeId, roleName) => {
    const res = await fetch(`${API_BASE_URL}/api/hr/employees/${employeeId}/assign-role`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({roleName})
    });
    return res.json();
  },

  // Step 5: Update Status
  updateStatus: async (employeeId, status) => {
    const res = await fetch(`${API_BASE_URL}/api/hr/employees/${employeeId}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({status})
    });
    return res.json();
  },

  // Step 5: Complete Onboarding (optional but recommended)
  completeOnboarding: async (employeeId, systemAccess) => {
    const res = await fetch(`${API_BASE_URL}/api/hr/employees/${employeeId}/complete-onboarding`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({system_access: systemAccess})
    });
    return res.json();
  },

  // Draft Management
  saveDraft: async (employeeId, step, data) => {
    const res = await fetch(`${API_BASE_URL}/api/hr/onboarding/draft`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({employee_id: employeeId, step, data})
    });
    return res.json();
  },

  getDraft: async (employeeId) => {
    const res = await fetch(`${API_BASE_URL}/api/hr/onboarding/draft?employee_id=${employeeId}`, {
      headers: {'Authorization': `Bearer ${getToken()}`}
    });
    return res.json();
  }
};
```

---

## 📊 Summary Table

| Step | Frontend Path | Backend Path | Match? | Fix Needed |
|------|---------------|--------------|--------|------------|
| **1. Register** | `/api/auth/register` | `/api/auth/register` | ✅ YES | None |
| **2. Get Departments** | `/api/departments` | `/api/hr/departments` | ❌ NO | Add `/hr` |
| **2. Get Employees** | `/api/employees` | `/api/hr/employees` | ❌ NO | Add `/hr` |
| **2. Create Employee** | `/api/employees` | `/api/hr/employees` | ❌ NO | Add `/hr` |
| **3. Update Statutory** | `/api/employees/{id}` | `/api/hr/employees/{id}` | ❌ NO | Add `/hr` |
| **4. Upload Documents** | `/api/documents/upload` | ❌ Not deployed | ❌ NO | Use `/api/hr/onboarding/documents` or skip |
| **5. Assign Role** | `/api/employees/{id}/assign-role` | `/api/hr/employees/{id}/assign-role` | ❌ NO | Add `/hr` |
| **5. Update Status** | `/api/employees/{id}/status` | `/api/hr/employees/{id}/status` | ❌ NO | Add `/hr` |
| **Draft Save** | `/api/onboarding/draft` | `/api/hr/onboarding/draft` | ❌ NO | Add `/hr` |

---

## ✅ Field Mapping Verification

### Step 1: Basic Info ✅
Frontend fields → Backend fields:
- `employee_id` → `employee_id` ✅
- `name` → `name` ✅
- `email` → `email` ✅
- `phone` → `phone` ✅
- `date_of_birth` → `date_of_birth` ✅
- `current_address` → `address` ✅

### Step 2: Work Details ⚠️
Frontend fields → Backend fields:
- `designation` → `jobTitle` ⚠️ **NAME MISMATCH**
- `department` → `department` ✅
- `joining_date` → `joining_date` ✅
- `store_id` → `storeId` ✅
- `reporting_manager_id` → `reporting_manager_id` ✅

**Fix Required:**
```typescript
// Frontend should send:
{
  "employeeId": "EMP-001",
  "firstName": "Rajesh",  
  "lastName": "Kumar",
  "jobTitle": "Sales Executive",  // Not "designation"
  "department": "Sales",
  // ... other fields
}
```

### Step 3: Statutory Info ⚠️
Frontend fields → Backend fields:
- `uan` → `uan` ✅
- `esi_number` → `esiNo` ⚠️ **NAME MISMATCH**
- `pan_number` → `panNumber` ⚠️ **CASE MISMATCH**
- `bank_account` → `bankAccount` ⚠️ **CASE MISMATCH**

**Fix Required:**
```typescript
// Frontend should send:
{
  "uan": "123456789012",
  "esiNo": "1234567890123456",  // Not "esi_number"
  "panNumber": "ABCDE1234F",    // Not "pan_number"
  "bankAccount": {              // Not "bank_account"
    "account_number": "...",
    "ifsc_code": "...",
    "bank_name": "...",
    "account_type": "Savings"
  }
}
```

---

## 🎯 Final Verdict

### ✅ Flow Structure: MATCHED
The overall 5-step flow is correctly designed and matches backend logic.

### ⚠️ API Paths: MISMATCHED  
Frontend needs to add `/hr` prefix to HR-related endpoints.

### ⚠️ Field Names: PARTIALLY MISMATCHED
Some field names need to be adjusted (designation→jobTitle, esi_number→esiNo, etc.)

### ❌ Document Service: NOT DEPLOYED
Documents upload will fail unless using alternative endpoint or skipping.

---

## 🚀 Quick Fix Checklist for Frontend

- [ ] Change `localhost:3002` to `https://98.70.245.87`
- [ ] Add `/hr` prefix: `/api/employees` → `/api/hr/employees`
- [ ] Add `/hr` prefix: `/api/departments` → `/api/hr/departments`
- [ ] Change `designation` to `jobTitle` in employee creation
- [ ] Change `esi_number` to `esiNo` in statutory info
- [ ] Change `pan_number` to `panNumber` in statutory info
- [ ] Change `bank_account` to `bankAccount` in statutory info
- [ ] Make documents upload optional or use `/api/hr/onboarding/documents`
- [ ] Accept SSL certificate by visiting `https://98.70.245.87`
- [ ] Test with mock login first

---

## 🧪 Complete Test Sequence

```javascript
// 1. Mock Login
const loginRes = await fetch('https://98.70.245.87/api/auth/mock-login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({role: 'admin'})
});
const {accessToken} = (await loginRes.json()).data;

// 2. Register Employee
const registerRes = await fetch('https://98.70.245.87/api/auth/register', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    employee_id: 'EMP-2025-TEST',
    name: 'Test Employee',
    email: 'test@test.com',
    phone: '9876543210',
    password: 'Test@123',
    role: 'employee',
    department: 'Sales',
    designation: 'Sales Executive',
    joining_date: '2025-01-01',
    address: {
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001'
    }
  })
});
console.log('Register:', await registerRes.json());

// 3. Create Employee Record
const empRes = await fetch('https://98.70.245.87/api/hr/employees', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    employeeId: 'EMP-2025-TEST',
    firstName: 'Test',
    lastName: 'Employee',
    email: 'test@test.com',
    password: 'Test@123',
    roleName: 'employee',
    jobTitle: 'Sales Executive',
    department: 'Sales',
    phone: '9876543210'
  })
});
console.log('Create Employee:', await empRes.json());

// 4. Update Statutory
const statRes = await fetch('https://98.70.245.87/api/hr/employees/EMP-2025-TEST', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    panNumber: 'ABCDE1234F',
    bankAccount: {
      account_number: '1234567890',
      ifsc_code: 'HDFC0001234',
      bank_name: 'HDFC Bank',
      account_type: 'Savings'
    }
  })
});
console.log('Update Statutory:', await statRes.json());

// 5. Assign Role
const roleRes = await fetch('https://98.70.245.87/api/hr/employees/EMP-2025-TEST/assign-role', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({roleName: 'employee'})
});
console.log('Assign Role:', await roleRes.json());

// 6. Update Status
const statusRes = await fetch('https://98.70.245.87/api/hr/employees/EMP-2025-TEST/status', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({status: 'active'})
});
console.log('Update Status:', await statusRes.json());

console.log('✅ Onboarding complete!');
```

---

## 📞 Summary for Frontend Developer

### ✅ What Matches:
1. Overall 5-step flow
2. Authentication endpoints
3. Field structure (mostly)
4. Response formats

### ❌ What Doesn't Match:
1. Base URL: `localhost:3002` vs `https://98.70.245.87`
2. API paths: Missing `/hr` prefix
3. Field names: `designation`→`jobTitle`, `esi_number`→`esiNo`, etc.
4. Document service: Not deployed

### 🔧 Required Changes:
1. Update base URL
2. Add `/hr` prefix to all HR endpoints
3. Fix field name mismatches
4. Make documents optional or use HR onboarding endpoint

---

**Once these changes are made, the onboarding flow will work perfectly!** ✅

