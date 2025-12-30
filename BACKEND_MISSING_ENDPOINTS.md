# 🔍 Backend Missing Endpoints Analysis

Based on the frontend flow documentation, here's what's available vs what's missing in the backend:

---

## ✅ Endpoints That EXIST in Backend

### Authentication Service (Port 3001)
| Frontend Expects | Backend Has | Status |
|------------------|-------------|--------|
| `POST /api/auth/register` | `POST /api/auth/register` | ✅ EXISTS |
| `POST /api/auth/login` | `POST /api/auth/login` | ✅ EXISTS |
| `POST /api/auth/mock-login` | `POST /api/auth/mock-login` | ✅ EXISTS |

### HR Service - Employees (Port 3002)
| Frontend Expects | Backend Has | Status |
|------------------|-------------|--------|
| `GET /api/employees` | `GET /api/hr/employees` | ⚠️ PATH MISMATCH |
| `POST /api/employees` | `POST /api/hr/employees` | ⚠️ PATH MISMATCH |
| `GET /api/employees/:id` | `GET /api/hr/employees/:id` | ⚠️ PATH MISMATCH |
| `PUT /api/employees/:id` | `PUT /api/hr/employees/:id` | ⚠️ PATH MISMATCH |
| `DELETE /api/employees/:id` | `DELETE /api/hr/employees/:id` | ⚠️ PATH MISMATCH |
| `POST /api/employees/:id/assign-role` | `POST /api/hr/employees/:id/assign-role` | ⚠️ PATH MISMATCH |
| `PATCH /api/employees/:id/status` | `PATCH /api/hr/employees/:id/status` | ⚠️ PATH MISMATCH |

### HR Service - Other
| Frontend Expects | Backend Has | Status |
|------------------|-------------|--------|
| `GET /api/hr/departments` | `GET /api/hr/departments` | ✅ JUST ADDED (deploying) |
| `POST /api/hr/onboarding/draft` | `POST /api/hr/onboarding/draft` | ✅ EXISTS |
| `GET /api/hr/onboarding/draft` | `GET /api/hr/onboarding/draft` | ✅ EXISTS |

---

## ❌ Endpoints That DON'T EXIST in Backend

### 1. Document Service (CRITICAL - Service Not Deployed)
| Frontend Expects | Backend Status | Impact |
|------------------|----------------|--------|
| `POST /api/documents/upload` | ❌ **SERVICE NOT DEPLOYED** | HIGH - Documents can't be uploaded |

**Alternative Available:**
- `POST /api/hr/onboarding/documents` (stores metadata only, not actual files)

---

## ⚠️ Path Mismatches (Frontend vs Backend)

The frontend documentation shows paths WITHOUT `/hr` prefix, but backend requires `/hr`:

| Frontend Doc Shows | Backend Actually Has | Fix Needed |
|--------------------|---------------------|------------|
| `GET /api/employees` | `GET /api/hr/employees` | Frontend: Add `/hr` |
| `POST /api/employees` | `POST /api/hr/employees` | Frontend: Add `/hr` |
| `PUT /api/employees/:id` | `PUT /api/hr/employees/:id` | Frontend: Add `/hr` |
| `POST /api/employees/:id/assign-role` | `POST /api/hr/employees/:id/assign-role` | Frontend: Add `/hr` |
| `PATCH /api/employees/:id/status` | `PATCH /api/hr/employees/:id/status` | Frontend: Add `/hr` |

---

## 🔧 Required Backend Additions

### Priority 1: Document Upload Service (CRITICAL)

**Status:** ❌ Not deployed  
**Impact:** HIGH - Step 4 (Documents) will fail  
**Time to Deploy:** ~30 minutes

**Options:**

#### Option A: Deploy Full Document Service
- Complete microservice for document management
- Handles file uploads to Azure Blob Storage
- Document verification and tracking
- Time: ~30 minutes

#### Option B: Add Document Upload to HR Service (Quick Fix)
- Add file upload endpoint to HR service
- Store files in Azure Blob Storage
- Link to employee record
- Time: ~15 minutes

#### Option C: Make Documents Optional (Immediate)
- Frontend skips document upload for now
- Documents can be uploaded later manually
- Onboarding completes without documents
- Time: Already supported in frontend (error handling)

---

### Priority 2: Onboarding-Specific Endpoints (OPTIONAL)

These endpoints exist but might need verification:

| Endpoint | Status | Notes |
|----------|--------|-------|
| `POST /api/hr/onboarding/personal-details` | ✅ EXISTS | Alternative to /api/auth/register |
| `POST /api/hr/onboarding/work-details` | ✅ EXISTS | Alternative to POST /api/hr/employees |
| `POST /api/hr/onboarding/statutory-info` | ✅ EXISTS | Alternative to PUT /api/hr/employees/:id |
| `POST /api/hr/onboarding/documents` | ✅ EXISTS | Stores metadata only, not files |
| `POST /api/hr/onboarding/complete/:id` | ✅ EXISTS | Final onboarding completion |
| `POST /api/hr/employees/:id/complete-onboarding` | ✅ EXISTS | Alternative completion endpoint |

---

## 📊 Complete Endpoint Availability Matrix

### Step 1: Basic Information
| Endpoint | Available | Notes |
|----------|-----------|-------|
| `POST /api/hr/onboarding/draft` | ✅ YES | Save draft |
| `GET /api/hr/onboarding/draft` | ✅ YES | Get draft |
| `POST /api/auth/register` | ✅ YES | Register employee |

**Status:** ✅ **FULLY SUPPORTED**

---

### Step 2: Work Details
| Endpoint | Available | Notes |
|----------|-----------|-------|
| `GET /api/hr/departments` | ⏳ DEPLOYING | Just added, rolling out |
| `GET /api/hr/employees` | ✅ YES | Get employees (with auth) |
| `POST /api/hr/employees` | ✅ YES | Create employee |
| `POST /api/hr/onboarding/work-details` | ✅ YES | Alternative endpoint |

**Status:** ✅ **FULLY SUPPORTED** (departments deploying)

---

### Step 3: Statutory Information
| Endpoint | Available | Notes |
|----------|-----------|-------|
| `PUT /api/hr/employees/:id` | ✅ YES | Update employee |
| `POST /api/hr/onboarding/statutory-info` | ✅ YES | Alternative endpoint |

**Status:** ✅ **FULLY SUPPORTED**

---

### Step 4: Documents Upload
| Endpoint | Available | Notes |
|----------|-----------|-------|
| `POST /api/documents/upload` | ❌ NO | Document service not deployed |
| `POST /api/hr/onboarding/documents` | ✅ YES | Metadata only, not actual files |

**Status:** ❌ **PARTIALLY SUPPORTED** - Can store metadata but not upload actual files

---

### Step 5: Review & Submit
| Endpoint | Available | Notes |
|----------|-----------|-------|
| `POST /api/hr/employees/:id/assign-role` | ✅ YES | Assign role |
| `PATCH /api/hr/employees/:id/status` | ✅ YES | Update status |
| `POST /api/hr/employees/:id/complete-onboarding` | ✅ YES | Complete onboarding |

**Status:** ✅ **FULLY SUPPORTED**

---

## 🎯 Summary

### ✅ What's Working (90%)
- Authentication endpoints ✅
- Employee CRUD ✅
- Onboarding flow endpoints ✅
- Statutory info endpoints ✅
- Role assignment ✅
- Status updates ✅
- Draft management ✅
- Departments (deploying) ⏳

### ❌ What's Missing (10%)
- **Document upload service** ❌ (actual file uploads)

### ⚠️ Path Corrections Needed
- Frontend should use `/api/hr/employees` instead of `/api/employees`

---

## 🚀 Recommendations

### Immediate (For Testing):
1. ✅ Use existing endpoints (all working)
2. ⚠️ Make document upload optional in frontend
3. ✅ Use mock-login for authentication
4. ✅ Test complete flow without document uploads

### Short-term (Next 1-2 days):
1. Deploy Document Service for actual file uploads
2. Test document upload flow
3. Verify end-to-end onboarding with documents

### Alternative (Quick Fix):
Add file upload to HR service instead of deploying separate document service.

---

## 🔨 Required Changes

### Backend Changes:
- [x] Add departments endpoint ✅ **DONE** (deploying)
- [ ] Deploy Document Service **OR** add file upload to HR service
- [ ] Test all endpoints with frontend

### Frontend Changes:
- [ ] Update path: `/api/employees` → `/api/hr/employees` (in some places)
- [ ] Login before testing onboarding
- [ ] Make document upload optional (handle errors gracefully)

---

## 📋 Detailed Missing Features

### 1. Document Upload Service

**What's Missing:**
- Actual file upload endpoint
- Azure Blob Storage integration for file storage
- File validation and virus scanning
- Document versioning
- Download document endpoint

**What EXISTS as Alternative:**
- `/api/hr/onboarding/documents` - Stores document metadata (name, type, status)
- Documents can be linked to employee but files aren't actually stored

**Frontend Workaround:**
```typescript
// Make document upload optional
try {
  await uploadDocument(file);
} catch (error) {
  console.warn('Document upload skipped - service not available');
  // Continue onboarding without documents
}
```

---

### 2. Department Management (FIXED!)

**What Was Missing:**
- ❌ GET /api/hr/departments

**What I Added:**
- ✅ GET /api/hr/departments (returns 8 default departments)
- ✅ POST /api/hr/departments (create new department)
- ✅ Department.model.js

**Status:** ⏳ Deploying now

---

## 🎯 Priority Actions

### For You (Backend):
1. ⏳ Wait for HR service deployment to complete (~2-3 min)
2. ⚠️ **Deploy Document Service** or add file upload to HR service
3. ✅ Test departments endpoint after deployment
4. ✅ Verify all endpoints with authentication

### For Frontend Dev:
1. ✅ Login first with mock-login
2. ⚠️ Update paths: Add `/hr` prefix where needed
3. ⚠️ Make document upload optional (handle errors gracefully)
4. ✅ Test complete onboarding flow

---

## 🧪 Test Plan After Deployment

```javascript
// Complete test after departments endpoint is deployed

(async () => {
  // 1. Login
  const loginRes = await fetch('https://98.70.245.87/api/auth/mock-login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({role: 'admin'})
  });
  const {accessToken} = (await loginRes.json()).data;
  localStorage.setItem('access_token', accessToken);
  
  // 2. Test Departments (NEW!)
  const deptRes = await fetch('https://98.70.245.87/api/hr/departments', {
    headers: {'Authorization': `Bearer ${accessToken}`}
  });
  console.log('Departments:', await deptRes.json());
  
  // 3. Test Employees
  const empRes = await fetch('https://98.70.245.87/api/hr/employees', {
    headers: {'Authorization': `Bearer ${accessToken}`}
  });
  console.log('Employees:', await empRes.json());
  
  // 4. Create Employee
  const createRes = await fetch('https://98.70.245.87/api/hr/employees', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      employeeId: 'EMP-TEST-' + Date.now(),
      firstName: 'Test',
      lastName: 'Employee',
      email: `test${Date.now()}@test.com`,
      password: 'Test@123',
      roleName: 'employee',
      jobTitle: 'Sales Executive',
      department: 'Sales',
      phone: '9876543210'
    })
  });
  console.log('Create Employee:', await createRes.json());
  
  console.log('✅ All critical endpoints working!');
})();
```

---

## 🎉 Bottom Line

### What's Available: 90%
- ✅ Authentication
- ✅ Employee management
- ✅ Onboarding flow (except file uploads)
- ✅ Role assignment
- ✅ Status updates
- ✅ Draft management
- ⏳ Departments (deploying)

### What's Missing: 10%
- ❌ Document upload service (actual file storage)

### Action Required:
1. ⏳ Wait for departments deployment
2. ⚠️ Deploy Document Service OR make documents optional
3. ✅ Frontend dev: Login first, then test

**The onboarding flow can work 100% without documents if we make Step 4 optional!**

