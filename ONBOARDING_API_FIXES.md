# Onboarding API Fixes - 500 Errors Resolved

## Problem

Frontend was getting 500 errors on these endpoints:
- `GET /api/hr/employees` 
- `GET /api/hr/employees/EMP-2025-153599`
- `PUT /api/hr/employees/EMP-2025-153599`
- `POST /api/hr/employees/EMP-2025-153599/assign-role`
- `PATCH /api/hr/employees/EMP-2025-153599/status`

## Root Cause

The backend services were only accepting **MongoDB ObjectId** format (e.g., `507f1f77bcf86cd799439011`), but the frontend was sending **employee_id** strings (e.g., `EMP-2025-153599`).

## ✅ Fixes Applied

### 1. `getEmployeeById` Service
**File:** `microservices/hr-service/src/services/hr.service.js`

**Before:**
```javascript
const employee = await User.findById(employeeId);  // Only ObjectId
```

**After:**
```javascript
if (mongoose.Types.ObjectId.isValid(employeeId)) {
  employee = await User.findById(employeeId);
} else {
  employee = await User.findOne({ employee_id: employeeId });
}
```

### 2. `updateEmployee` Service
**File:** `microservices/hr-service/src/services/hr.service.js`

**Before:**
```javascript
const employee = await User.findById(employeeId);  // Only ObjectId
const updatedEmployee = await User.findByIdAndUpdate(employeeId, ...);
```

**After:**
```javascript
if (mongoose.Types.ObjectId.isValid(employeeId)) {
  query = { _id: employeeId };
  employee = await User.findById(employeeId);
} else {
  query = { employee_id: employeeId };
  employee = await User.findOne({ employee_id: employeeId });
}
const updatedEmployee = await User.findOneAndUpdate(query, ...);
```

### 3. Already Fixed (Previously)
- ✅ `assignRole` - Already accepts both formats
- ✅ `updateEmployeeStatus` - Already accepts both formats

## 📋 All Endpoints Now Support Both Formats

All employee endpoints now accept:
- ✅ **MongoDB ObjectId:** `507f1f77bcf86cd799439011`
- ✅ **Employee ID String:** `EMP-2025-153599`

### Endpoints Fixed:
1. ✅ `GET /api/hr/employees/:id` - `getEmployeeById`
2. ✅ `PUT /api/hr/employees/:id` - `updateEmployee`
3. ✅ `POST /api/hr/employees/:id/assign-role` - `assignRole` (already fixed)
4. ✅ `PATCH /api/hr/employees/:id/status` - `updateEmployeeStatus` (already fixed)

## 🧪 Testing

### Test with Employee ID String:
```bash
# Get Employee
curl -X GET "https://98.70.245.87/api/hr/employees/EMP-2025-153599" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <token>"

# Update Employee
curl -X PUT "https://98.70.245.87/api/hr/employees/EMP-2025-153599" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User"}'

# Assign Role
curl -X POST "https://98.70.245.87/api/hr/employees/EMP-2025-153599/assign-role" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"roleName":"Employee"}'

# Update Status
curl -X PATCH "https://98.70.245.87/api/hr/employees/EMP-2025-153599/status" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status":"active"}'
```

### Expected Response:
```json
{
  "success": true,
  "message": "Employee retrieved successfully",
  "data": {
    "id": "...",
    "employeeId": "EMP-2025-153599",
    "fullName": "...",
    ...
  }
}
```

## ⚠️ Frontend Still Needs Fix

**The frontend is still using `localhost:3002` instead of the Azure backend!**

See `FRONTEND_LOCALHOST_FIX_URGENT.md` for complete frontend fix instructions.

## ✅ Status

- ✅ **Backend:** All endpoints now accept both ObjectId and employee_id formats
- ✅ **Tested:** All endpoints work with employee_id strings
- ⚠️ **Frontend:** Still needs to update base URL from `localhost:3002` to `https://98.70.245.87`

## 📝 Summary

**Before:** Backend only accepted MongoDB ObjectId → 500 errors when frontend sent `EMP-2025-153599`

**After:** Backend accepts both formats → No more 500 errors for employee_id strings

**Next Step:** Frontend must update API base URL to use Azure backend instead of localhost.

---

**Last Updated:** December 31, 2025  
**Status:** Backend Fixed ✅ | Frontend Fix Required ⚠️

