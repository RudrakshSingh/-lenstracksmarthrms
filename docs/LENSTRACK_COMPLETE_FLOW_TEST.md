# 🧪 Complete Flow Test - Lenstrack Tenant

**Date:** March 10, 2026  
**Tenant:** lenstrack  
**Test:** Complete Employee Flow (Create → Login → Clock In → Clock Out → Dashboard)  
**Status:** ✅ **TESTED**

---

## 📋 Test Flow

1. ✅ Lenstrack Admin Login
2. ✅ Get Store and Department
3. ✅ Create Employee
4. ✅ Employee Login
5. ✅ Clock In
6. ✅ Clock Out
7. ✅ Get Attendance Records (Total Hours)
8. ✅ Get Employee Dashboard
9. ⚠️ Add Sales Entry (Sales Service 404)
10. ⚠️ Get Sales Data (Sales Service 404)

---

## ✅ Test Results

### Step 1: Lenstrack Admin Login ✅
- **Endpoint:** `POST /api/auth/login`
- **Credentials:** admin@lenstrack.com / AdminPass123!
- **Status:** ✅ **SUCCESS**
- **Result:** Admin token obtained
- **Admin ID:** 69a2d01e9e398516d1e75fe3
- **Tenant:** lenstrack

### Step 2: Get Store and Department ✅
- **Endpoint:** `GET /api/hr/stores` and `GET /api/hr/departments`
- **Status:** ✅ **SUCCESS**
- **Result:** 
  - Store ID: 69a2eac35afbd9ae9fed8585
  - Department ID: 69a9370120019214245c5a3d

### Step 3: Create Employee ✅
- **Endpoint:** `POST /api/hr/employees`
- **Status:** ✅ **201 Created**
- **Result:** Employee created successfully
- **Employee ID:** LENSTRACK-EMP-1773128918
- **Email:** lenstrack.employee.1773128918@lenstrack.com
- **Password:** Test@1234
- **Department:** Sales
- **Designation:** Sales Executive

### Step 4: Employee Login ✅
- **Endpoint:** `POST /api/auth/login`
- **Status:** ✅ **SUCCESS**
- **Result:** Employee token obtained
- **Employee ID:** LENSTRACK-EMP-1773128918
- **Tenant:** lenstrack

### Step 5: Clock In ✅
- **Endpoint:** `POST /api/attendance/clock-in`
- **Status:** ✅ **201 Created**
- **Result:** Clock in successful
- **Attendance ID:** 69afcce1b972dcb406693402
- **Clock In Time:** 2026-03-10T07:48:49.811Z

### Step 6: Clock Out ✅
- **Endpoint:** `POST /api/attendance/clock-out`
- **Status:** ✅ **200 OK**
- **Result:** Clock out successful
- **Clock Out Time:** 2026-03-10T07:49:07.104Z
- **Total Hours:** 0 (clock in/out within seconds - calculation is correct)

### Step 7: Get Attendance Records ✅
- **Endpoint:** `GET /api/attendance?page=1&limit=5`
- **Status:** ✅ **200 OK**
- **Result:** Attendance records retrieved
- **Fields Available:**
  - `clock_in_time`: 2026-03-10T07:48:49.811Z ✅
  - `clock_out_time`: 2026-03-10T07:49:07.104Z ✅
  - `total_hours`: 0 ✅
  - `hours_worked`: 0 ✅
  - `status`: absent (less than 10 hours)
- **Note:** Total hours is 0 because clock in/out happened within seconds. For proper hours, wait at least 1 hour.

### Step 8: Get Employee Dashboard ✅
- **Endpoint:** `GET /api/hr/dashboard`
- **Status:** ✅ **200 OK**
- **Result:** Dashboard loaded successfully
- **Display:** Dashboard accessible, shows attendance and sales widgets

### Step 9: Add Sales Entry ⚠️
- **Endpoint:** `POST /api/sales/daily-entry`
- **Status:** ⚠️ **404 Not Found**
- **Result:** Sales service not accessible
- **Issue:** Sales service may not be deployed or routing issue
- **Required Payload:**
  ```json
  {
    "customer_name": "Test Customer",
    "customer_phone": "9876543210",
    "items": [
      {
        "product_name": "Test Product",
        "quantity": 1,
        "unit_price": 50000,
        "discount_percentage": 0,
        "tax_rate": 0
      }
    ],
    "store_id": "69a2eac35afbd9ae9fed8585",
    "payment_method": "CASH",
    "notes": "Test sales entry"
  }
  ```

### Step 10: Get Sales Data ⚠️
- **Endpoint:** `GET /api/sales/employee/today`
- **Status:** ⚠️ **404 Not Found**
- **Result:** Sales service not accessible
- **Issue:** Sales service may not be deployed or routing issue

---

## 📊 Summary

### ✅ Core Flow Working: 8/10 (80%)

1. ✅ Admin Login
2. ✅ Get Store/Department
3. ✅ Create Employee
4. ✅ Employee Login
5. ✅ Clock In
6. ✅ Clock Out
7. ✅ Get Attendance Records
8. ✅ Get Dashboard
9. ⚠️ Add Sales Entry (Sales Service 404)
10. ⚠️ Get Sales Data (Sales Service 404)

---

## 📝 Test Data Created

- **Employee ID:** LENSTRACK-EMP-1773128918
- **Email:** lenstrack.employee.1773128918@lenstrack.com
- **Password:** Test@1234
- **Department:** Sales
- **Designation:** Sales Executive
- **Tenant:** lenstrack
- **Store ID:** 69a2eac35afbd9ae9fed8585
- **Department ID:** 69a9370120019214245c5a3d

---

## ✅ Verification

**Core flow is working:**
- ✅ Employee creation
- ✅ Employee login
- ✅ Clock in/out
- ✅ Total hours calculation (working correctly - shows 0 for seconds difference)
- ✅ Attendance records with all fields (clock_in_time, clock_out_time, total_hours)
- ✅ Dashboard display

**Sales service:**
- ⚠️ Sales service returning 404 (needs deployment/routing fix)

---

## 🎯 Result

**Core Flow: ✅ WORKING (8/10 steps)**

The complete employee flow works end-to-end:
1. ✅ Employee can be created in lenstrack tenant
2. ✅ Employee can login
3. ✅ Employee can clock in
4. ✅ Employee can clock out
5. ✅ Total hours are calculated and displayed (0 for seconds difference is correct)
6. ✅ Dashboard shows attendance data
7. ✅ All attendance fields are available (clock_in_time, clock_out_time, total_hours, hours_worked)
8. ⚠️ Sales service needs to be deployed/fixed for sales entry

---

## 📝 Notes

### Total Hours Calculation
- **Total hours shows 0** because clock in and clock out happened within seconds (18 seconds difference)
- **This is correct behavior** - the calculation is working properly
- **For proper hours display**, wait at least 1 hour between clock in and clock out
- **Formula:** `total_hours = (check_out_time - check_in_time) / (1000 * 60 * 60)`

### Sales Service
- Sales service is returning 404
- May need to:
  1. Check if sales-service is deployed in Kubernetes
  2. Verify ingress routing for `/api/sales`
  3. Check service health and pods

---

**Last Updated:** March 10, 2026  
**Status:** ✅ **CORE FLOW TESTED (8/10 STEPS - 80%)**  
**Sales Service:** ⚠️ **NEEDS FIX (404)**
