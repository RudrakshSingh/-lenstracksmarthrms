# Role-Based Attendance APIs - Implementation Complete

## ✅ Implementation Summary

**Date:** 2026-02-20  
**Status:** ✅ **All role-based attendance APIs implemented**

## Features Implemented

### 1. ✅ Role-Based Access Control for Attendance

**Modified API:** `GET /api/attendance`

**Behavior:**
- **Admin/HR/SuperAdmin/Manager:** Can view all employees' attendance (with optional filters)
- **Employee:** Can only view their own attendance (automatically filtered)

**Implementation:**
- Modified `getAttendanceRecords` controller to check user role
- Employees are automatically restricted to their own `employee_id`
- Admin/HR can use filters: `employeeId`, `storeId`, `departmentId`, `date`, `startDate`, `endDate`

### 2. ✅ Store-Wise Attendance API (Admin/HR Only)

**New API:** `GET /api/attendance/store/:storeId`

**Purpose:** View attendance for all employees in a specific store

**Access:** Admin, HR, SuperAdmin, Manager only

**Query Parameters:**
- `date` (optional): Single date filter (YYYY-MM-DD)
- `startDate` (optional): Start date for range
- `endDate` (optional): End date for range
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Example:**
```http
GET /api/attendance/store/6991ba5479c5ee2bc02db8d6?date=2026-02-20
Authorization: Bearer <admin_token>
x-tenant-id: lenstrack
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "employeeId": "EMP-2026-116865",
      "employeeName": "Ravi Kumar",
      "date": "2026-02-20",
      "checkIn": "2026-02-20T09:00:00Z",
      "checkOut": "2026-02-20T18:00:00Z",
      "status": "present",
      "store": {
        "id": "6991ba5479c5ee2bc02db8d6",
        "name": "Store Name",
        "code": "STORE-001"
      }
    }
  ],
  "pagination": {
    "current": 1,
    "pages": 1,
    "total": 10
  },
  "message": "Store attendance retrieved successfully"
}
```

### 3. ✅ Department-Wise Attendance API (Admin/HR Only)

**New API:** `GET /api/attendance/department/:departmentId`

**Purpose:** View attendance for all employees in a specific department

**Access:** Admin, HR, SuperAdmin, Manager only

**Query Parameters:**
- `date` (optional): Single date filter (YYYY-MM-DD)
- `startDate` (optional): Start date for range
- `endDate` (optional): End date for range
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Example:**
```http
GET /api/attendance/department/6991ba5479c5ee2bc02db8d6?startDate=2026-02-01&endDate=2026-02-20
Authorization: Bearer <admin_token>
x-tenant-id: lenstrack
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "employeeId": "EMP-2026-116865",
      "employeeName": "Ravi Kumar",
      "date": "2026-02-20",
      "checkIn": "2026-02-20T09:00:00Z",
      "checkOut": "2026-02-20T18:00:00Z",
      "status": "present",
      "department": "Lab"
    }
  ],
  "pagination": {
    "current": 1,
    "pages": 1,
    "total": 15
  },
  "message": "Department attendance retrieved successfully"
}
```

### 4. ✅ Dashboard Attendance Based on Role

**Modified API:** `GET /api/hr/dashboard`

**Behavior:**
- **Admin/HR:** Dashboard shows overall attendance statistics (all employees)
- **Employee:** Dashboard shows their own attendance summary

**Implementation:**
- Modified `getUnifiedDashboard` service to check user role
- Admin/HR calls `/api/attendance/stats` for overall stats
- Employee calls `/api/attendance/summary` for their own summary

## Files Modified

### Attendance Service
1. **`microservices/attendance-service/src/controllers/attendanceController.js`**
   - Modified `getAttendanceRecords` to enforce role-based filtering
   - Added `getAttendanceByStore` function
   - Added `getAttendanceByDepartment` function

2. **`microservices/attendance-service/src/services/attendance.service.js`**
   - Added `getAttendanceRecordsByEmployeeIds` function for department-wise queries
   - Added `storeId` filter support in `getAttendanceRecords`

3. **`microservices/attendance-service/src/routes/attendance.routes.js`**
   - Added route: `GET /api/attendance/store/:storeId`
   - Added route: `GET /api/attendance/department/:departmentId`

### HR Service
4. **`microservices/hr-service/src/services/dashboard.service.js`**
   - Modified `getUnifiedDashboard` to show attendance based on role
   - Admin/HR see overall stats, employees see their own summary

5. **`microservices/hr-service/src/controllers/dashboardController.js`**
   - Updated to pass `req` object to dashboard service

## Security

✅ **Role-based access control enforced:**
- Employees cannot access other employees' attendance
- Employees cannot access store/department-wise APIs
- All APIs require authentication
- Role checks performed at controller level

## Deployment

**Deploy Script:** `deploy-role-based-attendance.sh`

**Services to Deploy:**
- `attendance-service`
- `hr-service`

**Deploy Command:**
```bash
./deploy-role-based-attendance.sh
```

## Testing

After deployment, test with:

1. **Employee Login:**
   ```bash
   # Should only see own attendance
   GET /api/attendance?employeeId=EMP-2026-116865
   ```

2. **Admin Login:**
   ```bash
   # Should see all employees
   GET /api/attendance
   
   # Store-wise
   GET /api/attendance/store/:storeId
   
   # Department-wise
   GET /api/attendance/department/:departmentId
   ```

## API Endpoints Summary

| Endpoint | Method | Access | Description |
|----------|--------|--------|-------------|
| `/api/attendance` | GET | All (role-filtered) | Get attendance records (role-based) |
| `/api/attendance/store/:storeId` | GET | Admin/HR only | Get attendance by store |
| `/api/attendance/department/:departmentId` | GET | Admin/HR only | Get attendance by department |
| `/api/hr/dashboard` | GET | All | Dashboard with role-based attendance |

---

**All role-based attendance APIs implemented and ready for deployment!** 🎯
