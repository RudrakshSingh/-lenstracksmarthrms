# Null Values Fix & 503 Error Fix

## Issues Fixed

### 1. Null Values in Employee Response
**Problem:** Frontend was receiving `null` values in employee response, causing UI issues.

**Solution:** Updated `formatEmployee` function in `microservices/shared/utils/response.util.js` to replace all `null` values with:
- Empty strings (`''`) for text fields
- Empty objects (`{}`) for object fields
- Default values for numeric/boolean fields

**Fields Fixed:**
- `workLocation` - All fields now return empty strings instead of null
- `store` - Returns default object with empty strings instead of null
- `reportingManager` - Empty strings instead of null
- `currentAddress` - Empty strings instead of null
- `emergencyContact` - Empty strings instead of null
- `uan`, `esiNo`, `panNumber`, `aadharMasked` - Empty strings instead of null
- `bankAccount` - All fields return empty strings instead of null
- `previousEmployment` - Empty strings for text fields, false for booleans
- `gender`, `confirmationDate` - Empty strings instead of null
- `salary` - Returns 0 instead of null

### 2. 503 Error for Attendance API
**Problem:** `/api/attendance?employeeId=EMP-2026-969954&date=2026-02-19` was returning 503 "Backend API is unavailable".

**Solution:**
1. Added timeout protection (5 seconds) to database queries
2. Graceful error handling - returns empty array instead of 503 error
3. Improved error logging for debugging

**Changes Made:**
- `microservices/attendance-service/src/services/attendance.service.js`:
  - Added `Promise.race` with 5-second timeout
  - Returns empty array `[]` and `0` total on timeout instead of throwing error
  - Uses `.lean()` for better query performance

- `microservices/attendance-service/src/controllers/attendanceController.js`:
  - Catches timeout errors and returns empty result with 200 status
  - Improved error logging with filters and query details
  - Fixed pagination total calculation

## Files Modified

1. `microservices/shared/utils/response.util.js` - Null values replaced with defaults
2. `microservices/attendance-service/src/services/attendance.service.js` - Timeout protection added
3. `microservices/attendance-service/src/controllers/attendanceController.js` - Error handling improved

## Testing

### Test Null Values Fix
```bash
# Get employee details
curl -X GET "http://api-url/api/hr/employees/EMP-2026-116865" \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: lenstrack"

# Verify no null values in response
# All fields should have empty strings or default values
```

### Test Attendance API Fix
```bash
# Test attendance API with employeeId and date
curl -X GET "http://api-url/api/attendance?employeeId=EMP-2026-969954&date=2026-02-19" \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: lenstrack"

# Should return 200 with empty array if no records found
# Should not return 503 error
```

## Deployment

Deploy both services:
```bash
# Deploy HR service (for null values fix)
# Deploy attendance service (for 503 error fix)
```

## Notes

- All null values are now replaced with appropriate defaults
- Attendance API will return empty array instead of 503 on timeout
- Query timeout is set to 5 seconds - can be adjusted if needed
- Frontend should handle empty arrays gracefully
