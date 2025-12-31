# Production Onboarding API Test Results

**Date:** 2025-12-31  
**Server:** https://api.etelios.com  
**Status:** 75% Success Rate (6/8 steps passing)

## Test Summary

Successfully tested all onboarding APIs on production server after pipeline deployment.

### ✅ **Passing Steps (6/8):**

1. **Step 1: Personal Details** ✅
   - **Endpoint:** `POST /api/hr/onboarding/personal-details`
   - **Status:** 201 Created
   - **Result:** Employee personal information successfully added
   - **Note:** Response structure differs from local (returns role data)

2. **Step 2: Work Details** ✅
   - **Endpoint:** `POST /api/hr/onboarding/work-details`
   - **Status:** 200 OK
   - **Result:** Work details added successfully
   - **Fixed:** CompensationProfile handling working correctly

3. **Step 3: Statutory Information** ✅
   - **Endpoint:** `POST /api/hr/onboarding/statutory-info`
   - **Status:** 200 OK
   - **Result:** Statutory information added successfully
   - **Fixed:** CompensationProfile handling working correctly

4. **Step 4: Documents** ✅
   - **Endpoint:** `POST /api/hr/onboarding/documents`
   - **Status:** 200 OK
   - **Result:** 4 documents successfully uploaded

5. **Step 5: Save Draft** ✅
   - **Endpoint:** `POST /api/hr/onboarding/draft`
   - **Status:** 200 OK
   - **Result:** Draft saved successfully

6. **Step 6: Get Draft** ✅
   - **Endpoint:** `GET /api/hr/onboarding/draft?employee_id=EMP1767190286526`
   - **Status:** 200 OK
   - **Result:** Draft retrieved successfully

### ❌ **Failing Steps (2/8):**

1. **Step 7: Complete Onboarding** ❌
   - **Endpoint:** `POST /api/hr/onboarding/complete/:id`
   - **Status:** 500 Internal Server Error
   - **Issue:** Server error when completing onboarding
   - **Employee ID:** EMP1767190286526
   - **MongoDB ID:** 69552f0e3d1b76548eead56e
   - **Action Required:** Check server logs for error details

2. **Step 8: Verify Employee** ❌
   - **Endpoint:** `GET /api/hr/employees?search=EMP1767190286526`
   - **Status:** 403 Forbidden
   - **Issue:** Permission denied - "Access denied. Insufficient permissions."
   - **Required Permission:** `user:read`
   - **Current Permissions:** Empty array
   - **Action Required:** Check RBAC configuration or use different endpoint

## Detailed Test Results

### Step 1: Personal Details ✅
**Request:**
```json
{
  "employee_id": "EMP1767190286526",
  "name": "Jane Smith",
  "email": "jane.smith1767190286526@test.com",
  "phone": "9876543210",
  "password": "Test@123456",
  "role": "employee",
  "date_of_birth": "1992-05-15",
  "address": {
    "city": "Delhi",
    "state": "Delhi",
    "pincode": "110001",
    "country": "India"
  }
}
```

**Response:** 201 Created
- Employee created successfully
- Note: Response structure returns role data instead of user data

### Step 2: Work Details ✅
**Request:**
```json
{
  "employeeId": "EMP1767190286526",
  "jobTitle": "Senior Software Engineer",
  "department": "IT",
  "designation": "Engineer",
  "role_family": "Technical",
  "joining_date": "2025-12-31",
  "employee_status": "ACTIVE",
  "base_salary": 75000,
  "pf_applicable": true,
  "esic_applicable": true,
  "pt_applicable": true,
  "tds_applicable": true,
  "pan_number": "ABCDE1234F",
  "tax_state": "Delhi"
}
```

**Response:** 200 OK
- Work details added successfully
- CompensationProfile created correctly

### Step 3: Statutory Information ✅
**Request:**
```json
{
  "employeeId": "EMP1767190286526",
  "bankAccount": {
    "account_number": "9876543210",
    "ifsc_code": "HDFC0001234",
    "bank_name": "HDFC Bank",
    "account_type": "Savings"
  },
  "uan": "123456789012",
  "esiNo": "123456789012345",
  "panNumber": "ABCDE1234F",
  "previousEmployment": {
    "has_previous_employment": true,
    "employer_name": "Previous Company",
    "from_date": "2020-01-01",
    "to_date": "2024-12-31"
  }
}
```

**Response:** 200 OK
- Statutory information added successfully

### Step 4: Documents ✅
**Request:**
```json
{
  "employeeId": "EMP1767190286526",
  "documents": [
    {
      "type": "AADHAR",
      "name": "Aadhar Card",
      "file_url": "https://example.com/documents/aadhar.pdf"
    },
    {
      "type": "PAN",
      "name": "PAN Card",
      "file_url": "https://example.com/documents/pan.pdf"
    },
    {
      "type": "PHOTO",
      "name": "Employee Photo",
      "file_url": "https://example.com/documents/photo.jpg"
    },
    {
      "type": "EDUCATION_CERTIFICATE",
      "name": "Degree Certificate",
      "file_url": "https://example.com/documents/degree.pdf"
    }
  ]
}
```

**Response:** 200 OK
- 4 documents uploaded successfully

### Step 5: Save Draft ✅
**Response:** 200 OK
- Draft saved successfully

### Step 6: Get Draft ✅
**Response:** 200 OK
- Draft retrieved successfully with all step data

### Step 7: Complete Onboarding ❌
**Request:**
```json
{
  "system_access": {
    "create_system_account": true,
    "role_name": "employee",
    "default_password": "Temp@123456",
    "password_options": {
      "force_change_on_first_login": true,
      "send_via_email": true,
      "send_via_sms": false
    },
    "notifications": {
      "email_welcome": true,
      "email_credentials": true,
      "notify_manager": true,
      "notify_hr": true
    }
  }
}
```

**Response:** 500 Internal Server Error
- Server error occurred
- **Action Required:** Check production server logs

### Step 8: Verify Employee ❌
**Response:** 403 Forbidden
- **Error:** "Access denied. Insufficient permissions."
- **Required:** `user:read` permission
- **Current:** Empty permissions array
- **Action Required:** 
  - Check RBAC configuration
  - Verify HR role has `user:read` permission
  - Or use alternative endpoint that doesn't require this permission

## Issues Identified

### 1. Step 7: Complete Onboarding - 500 Error
**Problem:** Server returns 500 Internal Server Error when completing onboarding

**Possible Causes:**
- Database connection issue
- Missing employee record
- Error in `completeOnboarding` service function
- MongoDB query failure

**Recommendation:**
- Check production server logs for detailed error
- Verify employee exists in database
- Check MongoDB connection status

### 2. Step 8: Verify Employee - 403 Permission Error
**Problem:** Access denied due to missing `user:read` permission

**Possible Causes:**
- HR role doesn't have `user:read` permission assigned
- RBAC middleware is checking for wrong permission
- Token doesn't include required permissions

**Recommendation:**
- Verify HR role has `user:read` permission in production
- Check RBAC configuration
- Consider using alternative endpoint (e.g., direct employee lookup by ID)

## Comparison: Local vs Production

| Step | Local | Production | Status |
|------|-------|------------|--------|
| Step 1: Personal Details | ✅ | ✅ | Working |
| Step 2: Work Details | ✅ | ✅ | **Fixed** |
| Step 3: Statutory Info | ✅ | ✅ | **Fixed** |
| Step 4: Documents | ✅ | ✅ | Working |
| Step 5: Save Draft | ✅ | ✅ | Working |
| Step 6: Get Draft | ✅ | ✅ | Working |
| Step 7: Complete | ✅ | ❌ | **Needs Investigation** |
| Step 8: Verify | ✅ | ❌ | **Permission Issue** |

## Success Rate

- **Local:** 100% (8/8 steps)
- **Production:** 75% (6/8 steps)

## Recommendations

1. **Investigate Step 7 Error:**
   - Check production server logs
   - Verify database connectivity
   - Test `completeOnboarding` function directly

2. **Fix Step 8 Permission:**
   - Add `user:read` permission to HR role
   - Or modify RBAC to allow HR role to read employees
   - Or use alternative verification endpoint

3. **Monitor:**
   - Set up alerts for 500 errors
   - Monitor onboarding completion rates
   - Track permission-related errors

## Test Files

- **Test Script:** `test-onboarding-production.js`
- **Results:** This document

## Next Steps

1. Check production server logs for Step 7 error details
2. Fix RBAC permissions for Step 8
3. Re-test after fixes
4. Document final production status

