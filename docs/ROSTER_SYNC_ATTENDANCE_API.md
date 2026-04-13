# Roster Sync Attendance API

**Date:** March 8, 2026  
**Status:** ✅ IMPLEMENTED

---

## 📋 Overview

The `/api/hr/roster/sync-attendance` API syncs roster entries with attendance records. It creates or updates attendance records based on roster data (store, shift, timings) for a specific date.

---

## 🔗 Endpoint

```
POST /api/hr/roster/sync-attendance
```

**Access:** Private (HR, Admin, SuperAdmin, Manager)

---

## 📥 Request

### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
x-tenant-id: <tenantId> (optional, defaults to 'default')
```

### Body
```json
{
  "date": "2026-03-08",        // Required: Date in YYYY-MM-DD format
  "employeeId": "EMP-2026-123" // Optional: Sync only this employee; if not provided, syncs all employees for the date
}
```

---

## 📤 Response

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "date": "2026-03-08",
    "total": 10,
    "successful": 8,
    "failed": 1,
    "skipped": 1,
    "results": [
      {
        "employeeId": "EMP-2026-123",
        "employeeName": "John Doe",
        "status": "success",
        "message": "Attendance synced successfully",
        "attendanceId": "65a1b2c3d4e5f6g7h8i9j0k1"
      },
      {
        "employeeId": "EMP-2026-124",
        "employeeName": "Jane Smith",
        "status": "failed",
        "message": "Employee not found",
        "error": "Employee not found: EMP-2026-124"
      },
      {
        "employeeId": "EMP-2026-125",
        "employeeName": "Bob Wilson",
        "status": "skipped",
        "message": "Shift is OFF, skipping attendance sync"
      }
    ]
  },
  "message": "Roster synced with attendance successfully"
}
```

### Error Response (404)
```json
{
  "success": false,
  "error": "No roster found for the specified date",
  "message": "No roster found"
}
```

### Error Response (400)
```json
{
  "success": false,
  "error": "date is required",
  "message": "Validation failed"
}
```

---

## 🔄 How It Works

### Step-by-Step Flow

1. **Validate Input**
   - Checks if `date` is provided
   - Validates date format (YYYY-MM-DD)

2. **Fetch Roster**
   - Calls `GET /api/hr/roster?date=<date>&employeeId=<id>` internally
   - Gets all roster entries for the specified date
   - If no roster found, returns 404

3. **Process Each Roster Entry**
   - For each roster entry:
     - **Skip** if shift is `OFF`
     - **Create/Update** attendance record via `POST /api/attendance`
     - Pass roster data: `employeeId`, `date`, `storeId`, `shift`, `shiftStart`, `shiftEnd`, `source: 'roster_sync'`, `rosterId`

4. **Attendance Service Processing**
   - Attendance service receives roster data
   - Fetches employee and store details from HR service
   - Creates new attendance record OR updates existing one
   - Sets status to `scheduled` for new records
   - Preserves existing `check_in_time`/`check_out_time` if present

5. **Return Results**
   - Returns summary: total, successful, failed, skipped
   - Returns detailed results array with status for each employee

---

## 📊 Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | Date that was synced |
| `total` | number | Total roster entries processed |
| `successful` | number | Number of successful syncs |
| `failed` | number | Number of failed syncs |
| `skipped` | number | Number of skipped entries (OFF shifts) |
| `results` | array | Detailed results for each employee |

### Result Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `employeeId` | string | Employee ID |
| `employeeName` | string | Employee name |
| `status` | string | `success`, `failed`, or `skipped` |
| `message` | string | Status message |
| `attendanceId` | string | (If success) Attendance record ID |
| `error` | string | (If failed) Error message |

---

## 🔍 Attendance Record Fields

When attendance is synced from roster, the following fields are set:

| Field | Source | Description |
|-------|--------|-------------|
| `employee` | Roster | Employee MongoDB ObjectId |
| `employee_id` | Roster | Employee ID string |
| `employeeName` | Roster | Employee name |
| `store` | Roster | Store MongoDB ObjectId |
| `store_code` | Roster | Store code |
| `date` | Roster | Date from roster |
| `shift` | Roster | Shift type (MORNING, EVENING, etc.) |
| `shiftStart` | Roster | Shift start time (HH:MM) |
| `shiftEnd` | Roster | Shift end time (HH:MM) |
| `source` | Fixed | `'roster_sync'` |
| `rosterId` | Roster | Roster entry ID |
| `status` | Default | `'scheduled'` (for new records) |

**Note:** Existing attendance records are updated with roster data, but `check_in_time` and `check_out_time` are preserved if they already exist.

---

## 🎯 Use Cases

### 1. Roster Page - Manual Sync
```javascript
// User clicks "Sync attendance" button for a date
const response = await fetch('/api/hr/roster/sync-attendance', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    date: '2026-03-08'
  })
});
```

### 2. My Workday - Auto Sync
```javascript
// After check-in, auto-sync roster for that employee + date
const response = await fetch('/api/hr/roster/sync-attendance', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    date: '2026-03-08',
    employeeId: 'EMP-2026-123'
  })
});
```

---

## ⚠️ Important Notes

1. **OFF Shifts**: Roster entries with `shift: 'OFF'` are skipped (not synced to attendance)

2. **Existing Attendance**: If attendance already exists for the date, it's updated with roster data but preserves:
   - `check_in_time` (if already set)
   - `check_out_time` (if already set)
   - Other attendance-specific fields

3. **Employee/Store Lookup**: The service fetches employee and store details from HR service. If not found, the sync fails for that entry.

4. **Tenant Isolation**: All operations respect tenant isolation. Only roster entries for the authenticated user's tenant are processed.

5. **Error Handling**: Individual roster entry failures don't stop the entire sync. Results include success/failure for each entry.

---

## 🔧 Implementation Details

### Files Modified

1. **Controller**: `microservices/hr-service/src/controllers/rosterController.js`
   - Added `syncAttendance` controller function

2. **Service**: `microservices/hr-service/src/services/roster.service.js`
   - Added `syncAttendance` service method

3. **Routes**: `microservices/hr-service/src/routes/roster.routes.js`
   - Added `POST /api/hr/roster/sync-attendance` route

4. **Attendance Service**: `microservices/attendance-service/src/services/attendance.service.js`
   - Added `syncAttendanceFromRoster` method

5. **Attendance Controller**: `microservices/attendance-service/src/controllers/attendanceController.js`
   - Updated `markAttendance` to handle roster sync requests

---

## ✅ Testing

### Test Case 1: Sync All Employees for a Date
```bash
curl -X POST http://localhost:3002/api/hr/roster/sync-attendance \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-03-08"
  }'
```

### Test Case 2: Sync Single Employee
```bash
curl -X POST http://localhost:3002/api/hr/roster/sync-attendance \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-03-08",
    "employeeId": "EMP-2026-123"
  }'
```

### Expected Results
- ✅ Returns 200 with sync results
- ✅ Creates/updates attendance records
- ✅ Skips OFF shifts
- ✅ Handles errors gracefully

---

**Last Updated:** March 8, 2026  
**Status:** ✅ IMPLEMENTED & READY FOR TESTING
