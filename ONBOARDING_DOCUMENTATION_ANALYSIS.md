# Employee Onboarding Documentation - Backend Analysis

**Date:** January 19, 2026  
**Frontend Documentation Version:** 1.0  
**Status:** ⚠️ **CRITICAL GAPS IDENTIFIED**

---

## Executive Summary

The frontend documentation specifies several **NEW fields** that are **NOT implemented** in the backend:

1. ❌ **`gender`** field (Step 1) - **MISSING**
2. ❌ **`annual_ctc`** field (Step 2) - **MISSING**
3. ❌ **`salary_breakdown`** object (Step 2) - **MISSING**
   - `basic` (annual)
   - `hra` (annual)
   - `special_allowance` (annual)
   - `pf_employer` (annual)
   - `gratuity` (annual)
   - `other_allowances` (annual)

**Impact:** Frontend cannot save/display these fields, breaking the salary structure feature.

---

## Detailed Field-by-Field Analysis

### ✅ Step 1: Basic Information - MOSTLY ALIGNED

| Frontend Field | Backend Field | Status | Notes |
|----------------|---------------|--------|-------|
| `employee_id` | `employeeId` | ✅ Supported | Auto-generated or manual |
| `code` | `code` | ✅ Supported | Auto-generated or manual |
| `name` | `fullName` | ✅ Supported | Also supports `firstName` + `lastName` |
| `father_name` | `fatherName` | ✅ Supported | Optional field |
| `date_of_birth` | `dob` | ✅ Supported | Date field |
| **`gender`** | **N/A** | ❌ **MISSING** | **NOT IN USER MODEL** |
| `email` | `email` | ✅ Supported | Required, unique |
| `phone` | `phone` | ✅ Supported | Required |
| `aadhar_number` | `aadharMasked` | ✅ Supported | Optional, formatted |
| `current_address.*` | `currentAddress.*` | ✅ Supported | Nested object with `lines[]` |
| `emergency_contact.*` | `emergencyContact.*` | ✅ Supported | Nested object |

**Missing:** `gender` field

---

### ⚠️ Step 2: Work Details & Compensation - CRITICAL GAPS

#### Work Information Fields

| Frontend Field | Backend Field | Status | Notes |
|----------------|---------------|--------|-------|
| `designation` | `designation` | ✅ Supported | Required |
| `department` | `department` | ✅ Supported | Required |
| `role_family` | `roleFamily` | ✅ Supported | Enum with 13 values |
| `grade_band` | `gradeBand` / `grade_band` | ✅ Supported | Both formats supported |
| `joining_date` | `doj` | ✅ Supported | Date field |
| `confirmation_date` | `confirmationDate` | ✅ Supported | Auto-calculated or manual |
| `employee_status` | `status` | ✅ Supported | Enum: active/inactive/terminated/on-leave |
| `category` | `category` | ⚠️ Partial | Not in User model, may be in Employee model |
| `store_id` | `workLocation.storeId` | ✅ Supported | Optional |
| `work_location_city` | `workLocation.city` | ✅ Supported | |
| `work_location_state` | `workLocation.state` | ✅ Supported | |
| `work_location_pincode` | `workLocation.pincode` | ✅ Supported | |
| `reporting_manager_id` | `reportingManager` | ✅ Supported | String field |
| `reporting_manager_name` | `reportingManagerName` | ✅ Supported | String field |

#### Salary & Compensation Fields - ❌ CRITICAL MISSING FIELDS

| Frontend Field | Backend Field | Status | Notes |
|----------------|---------------|--------|-------|
| `base_salary` | `salary` | ✅ Supported | Legacy monthly salary (String) |
| **`annual_ctc`** | **N/A** | ❌ **MISSING** | **NOT IN USER MODEL** |
| **`salary_breakdown.basic`** | **N/A** | ❌ **MISSING** | **NOT IN USER MODEL** |
| **`salary_breakdown.hra`** | **N/A** | ❌ **MISSING** | **NOT IN USER MODEL** |
| **`salary_breakdown.special_allowance`** | **N/A** | ❌ **MISSING** | **NOT IN USER MODEL** |
| **`salary_breakdown.pf_employer`** | **N/A** | ❌ **MISSING** | **NOT IN USER MODEL** |
| **`salary_breakdown.gratuity`** | **N/A** | ❌ **MISSING** | **NOT IN USER MODEL** |
| **`salary_breakdown.other_allowances`** | **N/A** | ❌ **MISSING** | **NOT IN USER MODEL** |

**Note:** `payroll-service` has a `Salary` model with `annual_ctc` and breakdown fields, but these are **NOT** in the `hr-service` User model used for onboarding.

#### Other Step 2 Fields

| Frontend Field | Backend Field | Status | Notes |
|----------------|---------------|--------|-------|
| `target_sales` | `target_sales` | ⚠️ Partial | May be in CompensationProfile model |
| `pf_applicable` | `pfApplicable` | ⚠️ Partial | In CompensationProfile, not User model |
| `esic_applicable` | `esicApplicable` | ⚠️ Partial | In CompensationProfile, not User model |
| `pt_applicable` | `ptApplicable` | ⚠️ Partial | In CompensationProfile, not User model |
| `tds_applicable` | `tdsApplicable` | ⚠️ Partial | In CompensationProfile, not User model |
| `pan_number` | `panNumber` | ✅ Supported | In User model |
| `tax_state` | `taxState` | ⚠️ Partial | In CompensationProfile, not User model |
| `leave_entitlements.*` | N/A | ⚠️ Partial | May be in separate Leave model |
| `incentive_slabs` | N/A | ⚠️ Partial | May be in CompensationProfile |

---

### ✅ Step 3: Statutory Information - ALIGNED

| Frontend Field | Backend Field | Status | Notes |
|----------------|---------------|--------|-------|
| `bankAccount.*` | `bankAccount.*` | ✅ Supported | Nested object |
| `uan` | `uan` | ✅ Supported | 12 digits |
| `esiNo` | `esiNo` | ✅ Supported | 15-17 digits |
| `panNumber` | `panNumber` | ✅ Supported | 10 characters |
| `previousEmployment.*` | `previousEmployment.*` | ✅ Supported | Nested object |

---

### ✅ Step 4: Documents - ALIGNED

| Frontend Field | Backend Field | Status | Notes |
|----------------|---------------|--------|-------|
| `documents[]` | `documents[]` | ✅ Supported | Array of document objects |
| `POST /api/hr/onboarding/upload` | ✅ Supported | File upload to Azure Blob |

---

## API Endpoint Analysis

### ✅ Supported Endpoints

| Method | Endpoint | Status | Notes |
|--------|----------|--------|-------|
| POST | `/api/hr/onboarding/draft` | ✅ Working | Saves draft data |
| GET | `/api/hr/onboarding/draft` | ✅ Working | Retrieves draft data |
| POST | `/api/hr/onboarding/personal-details` | ✅ Working | Step 1 data |
| POST | `/api/hr/onboarding/work-details` | ⚠️ Partial | Missing salary fields |
| POST | `/api/hr/onboarding/statutory-info` | ✅ Working | Step 3 data |
| POST | `/api/hr/onboarding/documents` | ✅ Working | Step 4 data |
| POST | `/api/hr/onboarding/upload` | ✅ Working | File upload |
| GET | `/api/hr/employees/:id` | ⚠️ Partial | Missing salary fields in response |
| PUT | `/api/hr/employees/:id` | ⚠️ Partial | Missing salary fields in request |
| GET | `/api/hr/departments` | ✅ Working | Department list |
| GET | `/api/hr/stores` | ✅ Working | Store list |
| GET | `/api/hr/employees` | ✅ Working | Employee list with filters |

---

## Response Format Analysis

### `formatEmployee()` Function

**Location:** `microservices/shared/utils/response.util.js`

**Current Fields Returned:**
- ✅ Basic info (id, employeeId, code, firstName, lastName, fullName, email, phone, avatar)
- ✅ Work details (department, designation, jobTitle, roleFamily, gradeBand, status, salary)
- ✅ Dates (doj, dob, joinDate, confirmationDate)
- ✅ Reporting (reportingManager, reportingManagerName)
- ✅ Work location (workLocation, store)
- ✅ Address (currentAddress)
- ✅ Emergency contact (emergencyContact)
- ✅ Statutory (uan, esiNo, aadharMasked, panNumber, bankAccount)
- ✅ Previous employment (previousEmployment)
- ✅ Documents (documents)
- ❌ **Missing:** `gender`
- ❌ **Missing:** `annual_ctc`
- ❌ **Missing:** `salary_breakdown`

---

## Validation Schema Analysis

### `workDetailsSchema` (Step 2)

**Location:** `microservices/hr-service/src/routes/onboarding.routes.js`

**Current Validation:**
```javascript
{
  employeeId: Joi.string().required(),
  jobTitle: Joi.string().required(),
  department: Joi.string().required(),
  designation: Joi.string().required(),
  role_family: Joi.string().required(),
  joining_date: Joi.date().required(),
  base_salary: Joi.number().min(0).optional(),
  // ... other fields
}
```

**Missing Validations:**
- ❌ `annual_ctc`
- ❌ `salary_breakdown.basic`
- ❌ `salary_breakdown.hra`
- ❌ `salary_breakdown.special_allowance`
- ❌ `salary_breakdown.pf_employer`
- ❌ `salary_breakdown.gratuity`
- ❌ `salary_breakdown.other_allowances`

---

## Database Schema Analysis

### User Model (`microservices/hr-service/src/models/User.model.js`)

**Current Salary Fields:**
- ✅ `salary` (String) - Legacy monthly salary

**Missing Fields:**
- ❌ `gender` (Enum: Male/Female/Other)
- ❌ `annual_ctc` (Number)
- ❌ `salary_breakdown` (Object with 6 fields)

**Note:** The `payroll-service` has a separate `Salary` model with these fields, but they are **NOT** in the `hr-service` User model used for employee onboarding and management.

---

## Required Backend Changes

### 1. Add `gender` Field to User Model

**File:** `microservices/hr-service/src/models/User.model.js`

**Add:**
```javascript
gender: {
  type: String,
  enum: ['Male', 'Female', 'Other'],
  trim: true
}
```

**Also update:**
- `registerSchema` in `onboarding.routes.js` to accept `gender`
- `personalDetailsSchema` in `onboarding.routes.js` to accept `gender`
- `formatEmployee()` in `response.util.js` to return `gender`

---

### 2. Add `annual_ctc` and `salary_breakdown` to User Model

**File:** `microservices/hr-service/src/models/User.model.js`

**Add:**
```javascript
annual_ctc: {
  type: Number,
  min: 0
},
salary_breakdown: {
  basic: {
    type: Number,
    min: 0
  },
  hra: {
    type: Number,
    min: 0
  },
  special_allowance: {
    type: Number,
    min: 0
  },
  pf_employer: {
    type: Number,
    min: 0
  },
  gratuity: {
    type: Number,
    min: 0
  },
  other_allowances: {
    type: Number,
    min: 0
  }
}
```

**Also update:**
- `workDetailsSchema` in `onboarding.routes.js` to validate these fields
- `formatEmployee()` in `response.util.js` to return these fields
- `updateEmployee()` in `hrController.js` to accept these fields

---

### 3. Update Validation Schemas

**File:** `microservices/hr-service/src/routes/onboarding.routes.js`

**Update `workDetailsSchema`:**
```javascript
const workDetailsSchema = {
  body: Joi.object({
    // ... existing fields ...
    annual_ctc: Joi.number().min(0).required(),
    salary_breakdown: Joi.object({
      basic: Joi.number().min(0).optional(),
      hra: Joi.number().min(0).optional(),
      special_allowance: Joi.number().min(0).optional(),
      pf_employer: Joi.number().min(0).optional(),
      gratuity: Joi.number().min(0).optional(),
      other_allowances: Joi.number().min(0).optional()
    }).optional()
  })
};
```

**Update `registerSchema` or `personalDetailsSchema`:**
```javascript
gender: Joi.string().valid('Male', 'Female', 'Other').required()
```

---

### 4. Update Response Formatter

**File:** `microservices/shared/utils/response.util.js`

**Update `formatEmployee()`:**
```javascript
function formatEmployee(employee) {
  // ... existing code ...
  return {
    // ... existing fields ...
    gender: emp.gender,
    annual_ctc: emp.annual_ctc,
    salary_breakdown: emp.salary_breakdown,
    // ... rest of fields ...
  };
}
```

---

### 5. Update Service Layer

**File:** `microservices/hr-service/src/services/hr.service.js`

**Update `createEmployee()` and `updateEmployee()`** to handle:
- `gender` field
- `annual_ctc` field
- `salary_breakdown` object

---

## Migration Strategy

### Option 1: Add Fields to User Model (Recommended)

**Pros:**
- Single source of truth
- Easy to query and update
- Consistent with frontend expectations

**Cons:**
- Requires database migration
- May duplicate data with payroll-service

**Steps:**
1. Add fields to User model schema
2. Create migration script to add fields to existing users (optional defaults)
3. Update validation schemas
4. Update response formatters
5. Update service layer
6. Test with frontend

---

### Option 2: Use CompensationProfile Model

**Pros:**
- Separates compensation from basic employee data
- Already has some salary fields

**Cons:**
- Requires joining two models for employee view
- More complex queries
- Frontend expects single model

**Steps:**
1. Ensure CompensationProfile has all required fields
2. Update service layer to create/update CompensationProfile during onboarding
3. Update `formatEmployee()` to join CompensationProfile data
4. Update validation to accept and save to both models

---

## Testing Checklist

After implementing changes:

- [ ] Step 1: Can save `gender` field
- [ ] Step 1: `gender` appears in GET `/api/hr/employees/:id` response
- [ ] Step 2: Can save `annual_ctc` field
- [ ] Step 2: Can save `salary_breakdown` object with all 6 fields
- [ ] Step 2: `annual_ctc` appears in GET response
- [ ] Step 2: `salary_breakdown` appears in GET response
- [ ] Edit Page: Can update `annual_ctc` and `salary_breakdown`
- [ ] View Page: Displays `gender`, `annual_ctc`, and `salary_breakdown` correctly
- [ ] Validation: Rejects invalid `gender` values
- [ ] Validation: Rejects negative `annual_ctc` values
- [ ] Validation: Rejects negative salary breakdown values

---

## Priority

### 🔴 **CRITICAL (P0)**
1. Add `gender` field to User model
2. Add `annual_ctc` field to User model
3. Add `salary_breakdown` object to User model

### 🟡 **HIGH (P1)**
4. Update validation schemas
5. Update response formatters
6. Update service layer

### 🟢 **MEDIUM (P2)**
7. Add migration script for existing data
8. Update API documentation

---

## Estimated Implementation Time

- **Model Changes:** 30 minutes
- **Validation Updates:** 30 minutes
- **Response Formatter:** 15 minutes
- **Service Layer:** 30 minutes
- **Testing:** 1 hour
- **Total:** ~2.5 hours

---

## Notes

1. **Salary Breakdown Values:** All values in `salary_breakdown` are **annual amounts** (not monthly), as per frontend documentation.

2. **Monthly Gross Calculation:** Frontend calculates `monthly_gross = annual_ctc / 12`. Backend should not duplicate this logic.

3. **Legacy `salary` Field:** Keep `salary` field for backward compatibility, but prefer `annual_ctc` for new employees.

4. **Payroll Service Integration:** Consider syncing `annual_ctc` and `salary_breakdown` to `payroll-service` Salary model during onboarding completion.

---

**Document Version:** 1.0  
**Last Updated:** January 19, 2026  
**Next Review:** After implementation
