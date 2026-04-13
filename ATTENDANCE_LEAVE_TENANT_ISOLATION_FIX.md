# 🔒 Attendance Dashboard Tenant Isolation & Leave Integration Fix

**Issue:** 
1. Admin/HR dashboard mein attendance widgets mein 78 employees dikh rahe the (sab tenants ke)
2. Tenant isolation missing thi
3. Leave calculation missing thi - agar employee ne leave li, to attendance mein leave dikhna chahiye
4. Employee/HR ko leave mark karne ka system nahi tha

---

## ✅ Fixes Applied

### 1. **Tenant Isolation in Attendance Dashboard**

#### Problem
- Attendance dashboard mein sab tenants ke employees dikh rahe the
- Attendance records fetch karte waqt tenant filtering nahi ho rahi thi

#### Solution
- ✅ Dashboard service mein tenant filtering add kiya
- ✅ Attendance records fetch karte waqt sirf current tenant ke employees fetch kiye
- ✅ Leave requests bhi tenant-wise filter kiye (employee_id se tenant match kiya)

**Changes in `dashboard.service.js`:**
```javascript
// Get all employees for current tenant
const allEmployees = await User.find({
  tenantId: scopedTenantId,
  isDeleted: false,
  status: { $in: ['active', 'on-leave'] }
})
  .select('_id employeeId employee_id firstName lastName fullName')
  .lean();

// Get leave requests for tenant employees only
const tenantEmployeeIds = allEmployees.map(e => e._id);
const todayLeaves = await LeaveRequest.find({
  employee_id: { $in: tenantEmployeeIds }, // CRITICAL: Filter by tenant
  status: { $in: ['APPROVED', 'AUTO_APPROVED'] },
  from_date: { $lte: todayEnd },
  to_date: { $gte: todayStart }
})
```

---

### 2. **Leave Integration in Attendance**

#### Problem
- Agar employee ne leave li, to attendance mein leave status nahi dikh raha tha
- Employee dashboard pr "on leave" message nahi dikh raha tha
- HR/Admin dashboard pr bhi leave status nahi dikh raha tha

#### Solution
- ✅ Leave requests check karke attendance records mein leave status add kiya
- ✅ Employee dashboard pr leave status dikhaya
- ✅ HR/Admin dashboard pr bhi leave status dikhaya
- ✅ Employees jo leave pr hain but attendance record nahi hai, unhe bhi add kiya

**Changes:**

**For HR/Admin Dashboard:**
```javascript
// Check if employee is on leave
const employeeLeave = leaveMap.get(employeeObjId) || leaveMap.get(employeeId?.toUpperCase());
const isOnLeave = employeeLeave && employeeLeave.length > 0;

return {
  ...attendanceRecord,
  status: isOnLeave ? 'on_leave' : (record.status || 'absent'),
  isOnLeave: isOnLeave,
  leaveType: leaveInfo?.leave_type || null,
  leaveReason: leaveInfo?.reason || null
};

// Add employees on leave but no attendance record
todayLeaves.forEach(leave => {
  if (!employeesWithAttendance.has(empId)) {
    attendanceDetails.push({
      employeeId: employee.employeeId,
      employeeName: employee.fullName,
      status: 'on_leave',
      isOnLeave: true,
      leaveType: leave.leave_type,
      // ...
    });
  }
});
```

**For Employee Dashboard:**
```javascript
// Check if employee is on leave today
const todayLeave = await LeaveRequest.findOne({
  employee_id: userEmployeeId,
  status: { $in: ['APPROVED', 'AUTO_APPROVED'] },
  from_date: { $lte: todayEnd },
  to_date: { $gte: todayStart }
});

if (todayLeave) {
  dashboardData.widgets.attendance.today = {
    status: 'on_leave',
    isOnLeave: true,
    leaveType: leaveInfo?.leave_type || null,
    leaveReason: leaveInfo?.reason || null
  };
}
```

---

### 3. **Leave Marking API**

#### Problem
- Employee ya HR ko leave mark karne ka simple way nahi tha
- Leave request create karna complex process tha

#### Solution
- ✅ Simple API endpoint add kiya: `POST /api/hr/leave/mark-today`
- ✅ Employee apne liye leave mark kar sakta hai
- ✅ HR/Admin kisi bhi employee ko leave mark kar sakta hai
- ✅ HR/Admin mark kare to auto-approve ho jata hai
- ✅ Employee mark kare to pending status mein jata hai

**New Endpoint:**
```javascript
POST /api/hr/leave/mark-today
Body: {
  employeeId?: string,  // Optional - if not provided, marks self
  leaveType?: string,   // Default: 'CL'
  reason?: string       // Default: 'On leave today'
}
```

**Features:**
- Employee can mark themselves: `POST /api/hr/leave/mark-today` (no employeeId)
- HR/Admin can mark any employee: `POST /api/hr/leave/mark-today { employeeId: "..." }`
- Auto-approve if marked by HR/Admin
- Pending status if marked by employee (needs approval)
- Prevents duplicate leave requests for same day

**Implementation:**
```javascript
const markLeaveToday = async (req, res, next) => {
  // Determine target employee
  let targetEmployeeId = employeeId || req.user?.employee_id;
  
  // Check permissions
  if (employeeId && !isAdminOrHR) {
    return sendError(res, 'You can only mark yourself on leave', 403);
  }
  
  // Check if already on leave
  const existingLeave = await LeaveRequest.findOne({
    employee_id: employee._id,
    status: { $in: ['APPROVED', 'AUTO_APPROVED', 'PENDING'] },
    from_date: { $lte: todayEnd },
    to_date: { $gte: todayStart }
  });
  
  // Create leave request
  const leaveRequest = new LeaveRequest({
    // ... leave details
    status: isAdminOrHR ? 'APPROVED' : 'PENDING'
  });
  
  await leaveRequest.save();
};
```

---

### 4. **Dashboard Widget Updates**

#### Changes Made:
- ✅ Attendance records mein `isOnLeave`, `leaveType`, `leaveReason` fields add kiye
- ✅ Attendance stats mein `onLeave` count add kiya
- ✅ Employee dashboard pr "on leave today" message dikhaya
- ✅ HR/Admin dashboard pr bhi leave status dikhaya

**Response Structure:**
```json
{
  "widgets": {
    "attendance": {
      "records": [
        {
          "employeeId": "EMP-2026-xxx",
          "employeeName": "John Doe",
          "status": "on_leave",
          "isOnLeave": true,
          "leaveType": "CL",
          "leaveReason": "Personal work",
          "checkIn": null,
          "checkOut": null
        }
      ],
      "overall": {
        "total": 50,
        "present": 35,
        "absent": 10,
        "onLeave": 5
      }
    }
  }
}
```

---

## 📊 API Endpoints

### 1. Mark Leave for Today
**Endpoint:** `POST /api/hr/leave/mark-today`

**Request:**
```json
{
  "employeeId": "EMP-2026-xxx",  // Optional - omit to mark self
  "leaveType": "CL",              // Optional - default: "CL"
  "reason": "Personal work"        // Optional - default: "On leave today"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Employee marked on leave successfully",
  "data": {
    "leaveRequest": { /* LeaveRequest object */ },
    "message": "Employee marked on leave for today"
  }
}
```

**Permissions:**
- Employee: Can mark themselves only
- HR/Admin: Can mark any employee

---

## 🔍 How It Works

### 1. **Tenant Isolation Flow**
```
1. Dashboard request comes with tenantId (from header or user)
2. Fetch all employees for current tenant only
3. Fetch attendance records (attendance service filters by tenantId)
4. Fetch leave requests for tenant employees only
5. Match attendance records with leave requests
6. Return filtered data
```

### 2. **Leave Integration Flow**
```
1. Fetch attendance records for today
2. Fetch approved leave requests for today
3. For each attendance record:
   - Check if employee has leave
   - If yes, mark status as "on_leave"
   - Add leaveType and leaveReason
4. For employees on leave but no attendance:
   - Add them to attendance list with "on_leave" status
5. Update stats with onLeave count
```

### 3. **Leave Marking Flow**
```
1. Employee/HR calls POST /api/hr/leave/mark-today
2. Check permissions:
   - Employee can only mark self
   - HR/Admin can mark anyone
3. Check if already on leave (prevent duplicates)
4. Create LeaveRequest:
   - If HR/Admin: status = APPROVED
   - If Employee: status = PENDING
5. Save and return
```

---

## 🧪 Testing

### Test Case 1: Tenant Isolation
```bash
# Login as Tenant 1 user
curl -X GET "http://api.etelios.com/api/hr/dashboard" \
  -H "Authorization: Bearer <tenant1_token>" \
  -H "X-Tenant-Id: tenant1"

# Should only show Tenant 1 employees
```

### Test Case 2: Mark Leave
```bash
# Employee marks self on leave
curl -X POST "http://api.etelios.com/api/hr/leave/mark-today" \
  -H "Authorization: Bearer <employee_token>" \
  -H "Content-Type: application/json" \
  -d '{"leaveType": "CL", "reason": "Personal work"}'

# HR marks employee on leave
curl -X POST "http://api.etelios.com/api/hr/leave/mark-today" \
  -H "Authorization: Bearer <hr_token>" \
  -H "Content-Type: application/json" \
  -d '{"employeeId": "EMP-2026-xxx", "leaveType": "SL", "reason": "Sick leave"}'
```

### Test Case 3: Check Leave Status in Dashboard
```bash
# Get dashboard - should show leave status
curl -X GET "http://api.etelios.com/api/hr/dashboard" \
  -H "Authorization: Bearer <token>"

# Check attendance.records for isOnLeave: true
```

---

## ✅ Deployment Status

- ✅ Code updated
- ✅ Docker image built
- ✅ Image pushed to ECR
- ✅ Deployment restarted
- ⏳ Testing pending

---

## 📝 Frontend Integration

### Display Leave Status

**Employee Dashboard:**
```typescript
const { widgets } = dashboardData;

if (widgets.attendance?.today?.isOnLeave) {
  return (
    <div className="leave-banner">
      <p>You are on leave today ({widgets.attendance.today.leaveType})</p>
      <p>{widgets.attendance.today.leaveReason}</p>
    </div>
  );
}
```

**HR/Admin Dashboard:**
```typescript
const attendanceRecords = widgets.attendance?.records || [];

attendanceRecords.map(record => (
  <div key={record.employeeId}>
    {record.isOnLeave ? (
      <span className="badge leave">On Leave ({record.leaveType})</span>
    ) : (
      <span className="badge present">Present</span>
    )}
  </div>
));
```

### Mark Leave Button

```typescript
const markLeaveToday = async () => {
  try {
    const response = await fetch('/api/hr/leave/mark-today', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        leaveType: 'CL',
        reason: 'Personal work'
      })
    });
    
    const result = await response.json();
    if (result.success) {
      // Refresh dashboard
      fetchDashboard();
    }
  } catch (error) {
    console.error('Error marking leave:', error);
  }
};
```

---

## 🔒 Security & Permissions

1. **Tenant Isolation:**
   - ✅ All queries filter by tenantId
   - ✅ Employees fetched only for current tenant
   - ✅ Leave requests filtered by tenant employees

2. **Leave Marking:**
   - ✅ Employee can only mark themselves
   - ✅ HR/Admin can mark any employee in their tenant
   - ✅ Prevents duplicate leave requests

3. **Data Access:**
   - ✅ Attendance records filtered by tenant
   - ✅ Leave requests filtered by tenant
   - ✅ No cross-tenant data leakage

---

## 📋 Summary

### Fixed Issues:
1. ✅ Tenant isolation in attendance dashboard
2. ✅ Leave integration in attendance
3. ✅ Leave marking API for employee/HR
4. ✅ Dashboard widgets showing leave status

### New Features:
1. ✅ `POST /api/hr/leave/mark-today` endpoint
2. ✅ Auto-approve leave when marked by HR/Admin
3. ✅ Leave status in attendance records
4. ✅ Leave count in attendance stats

### Status:
- ✅ **Code Complete**
- ✅ **Deployed**
- ⏳ **Testing Required**

---

**Next Steps:**
1. Test tenant isolation - verify only current tenant employees show
2. Test leave marking - employee and HR scenarios
3. Test leave display - verify leave status in dashboards
4. Frontend integration - update UI to show leave status
