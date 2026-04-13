# Clock-in and Roster API Fixes

## Issues Fixed

### 1. Clock-in Performance and Multiple Clock-ins Per Day

**Problem:**
- Clock-in API was taking too long
- Not supporting multiple clock-ins per day (even after clock-out)
- Query was checking ALL attendance records (not just today)

**Root Cause:**
- The query was checking for open attendance across all time periods
- No date filter was applied, causing slow queries on large datasets
- Query was not optimized (not using lean())

**Fix Applied:**
```javascript
// Before: Checked all time periods
const openAttendance = await Attendance.findOne({
  employee: employeeMongoId,
  check_in_time: { $exists: true },
  check_out_time: { $exists: false }
}).sort({ check_in_time: -1 });

// After: Only checks TODAY's attendance (optimized)
const today = new Date();
today.setHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const openAttendance = await Attendance.findOne({
  employee: employeeMongoId,
  employee_id: employee.employeeId || employee.employee_id,
  $or: [
    { date: { $gte: today, $lt: tomorrow } },
    { check_in_time: { $gte: today, $lt: tomorrow } }
  ],
  check_in_time: { $exists: true },
  check_out_time: { $exists: false }
})
.select('_id check_in_time check_out_time date')
.lean(); // Faster query execution
```

**Benefits:**
- ✅ Much faster query (only checks today's records)
- ✅ Allows multiple clock-ins per day (after clock-out)
- ✅ Uses lean() for better performance
- ✅ Added date filter to improve query speed

---

### 2. Roster API 503 Errors

**Problem:**
- Frontend calling `/api/roster` but backend only had `/api/hr/roster`
- All roster API calls returning 503 errors
- Routes not accessible from frontend

**Root Cause:**
- Frontend was calling `/api/roster` (without `/hr` prefix)
- Backend only mounted routes at `/api/hr/roster`
- No alias route for frontend compatibility

**Fix Applied:**
```javascript
// Before: Only mounted at /api/hr/roster
app.use('/api/hr/roster', apiRateLimit, rosterRoutes);

// After: Mounted at both paths for compatibility
app.use('/api/hr/roster', apiRateLimit, rosterRoutes);
app.use('/api/roster', apiRateLimit, rosterRoutes); // Frontend compatibility
```

**Benefits:**
- ✅ Frontend can call `/api/roster` (works now)
- ✅ Backend still supports `/api/hr/roster` (backward compatible)
- ✅ All roster APIs accessible from frontend

---

## Files Changed

1. **`microservices/attendance-service/src/services/attendance.service.js`**
   - Optimized clock-in check query
   - Added date filter for today's attendance only
   - Used lean() for better performance

2. **`microservices/hr-service/src/server.js`**
   - Added `/api/roster` alias route mounting
   - Routes now available at both `/api/hr/roster` and `/api/roster`

---

## Testing

### Test Clock-in Performance
```bash
# Test multiple clock-ins per day
1. Clock in
2. Clock out
3. Clock in again (should work now)
```

### Test Roster APIs
```bash
# Test frontend routes
curl -X GET "http://localhost:3000/api/roster" \
  -H "Authorization: Bearer <token>"

# Test backend routes (should also work)
curl -X GET "http://localhost:3000/api/hr/roster" \
  -H "Authorization: Bearer <token>"
```

---

## Deployment

### Deploy Attendance Service
```bash
cd microservices/attendance-service
docker build -t attendance-service:latest .
# Push to ECR and deploy to EKS
```

### Deploy HR Service
```bash
cd microservices/hr-service
docker build -t hr-service:latest .
# Push to ECR and deploy to EKS
```

---

## Expected Results

1. **Clock-in Performance:**
   - ✅ Much faster response time (< 1 second)
   - ✅ Multiple clock-ins per day supported (after clock-out)
   - ✅ No more "already clocked in" errors when clocked out

2. **Roster APIs:**
   - ✅ All `/api/roster/*` endpoints working
   - ✅ No more 503 errors
   - ✅ Frontend can access all roster APIs

---

## Notes

- Clock-in query is now optimized to only check today's attendance
- Multiple clock-ins per day are allowed (after clock-out)
- Roster APIs are accessible from both `/api/roster` and `/api/hr/roster`
- All changes are backward compatible
