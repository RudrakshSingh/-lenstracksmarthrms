# ✅ Leave Approval & Rejection System

**Issue:** Managers aur HR ko pending leave requests approve/reject karne ka simple way nahi tha with reason.

---

## ✅ Fixes Applied

### 1. **Simple Approve Endpoint**
- ✅ New endpoint: `POST /api/hr/leave-requests/:id/approve`
- ✅ Manager apne team members ki leave approve kar sakta hai
- ✅ HR/Admin kisi bhi employee ki leave approve kar sakta hai
- ✅ Comments optional (approval reason)

### 2. **Enhanced Reject Endpoint**
- ✅ `POST /api/hr/leave-requests/:id/reject` enhanced
- ✅ **Reason required** - rejection reason mandatory hai
- ✅ Manager apne team members ki leave reject kar sakta hai
- ✅ HR/Admin kisi bhi employee ki leave reject kar sakta hai
- ✅ Proper permission checks

### 3. **Get Pending Leave Requests**
- ✅ `GET /api/hr/leave-requests?pending_for_me=true` - Manager/HR ke liye
- ✅ Manager ko sirf apne team members ki pending leaves dikhengi
- ✅ HR ko tenant ke sab pending leaves dikhengi
- ✅ Tenant isolation applied

### 4. **Permission System**
- ✅ Manager: Sirf apne team members ki leave approve/reject kar sakta hai
- ✅ HR/Admin: Kisi bhi employee ki leave approve/reject kar sakta hai
- ✅ Employee: Sirf apni leave requests dekh sakta hai

---

## 📡 API Endpoints

### 1. **Approve Leave Request**
**Endpoint:** `POST /api/hr/leave-requests/:id/approve`

**Request:**
```json
{
  "comments": "Approved - work can be managed"  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Leave request approved successfully",
  "data": {
    "request_id": "LR-EMP-2026-xxx-1234567890",
    "status": "APPROVED",
    "approved_by": "...",
    "approved_at": "2026-03-07T...",
    "approvers": [...]
  }
}
```

**Permissions:**
- Manager: Can approve only their team members' leaves
- HR/Admin: Can approve any employee's leave

---

### 2. **Reject Leave Request**
**Endpoint:** `POST /api/hr/leave-requests/:id/reject`

**Request:**
```json
{
  "reason": "Cannot approve due to critical project deadline"  // REQUIRED
}
```

**Response:**
```json
{
  "success": true,
  "message": "Leave request rejected successfully",
  "data": {
    "request_id": "LR-EMP-2026-xxx-1234567890",
    "status": "REJECTED",
    "rejected_by": "...",
    "rejected_at": "2026-03-07T...",
    "rejection_reason": "Cannot approve due to critical project deadline"
  }
}
```

**Permissions:**
- Manager: Can reject only their team members' leaves
- HR/Admin: Can reject any employee's leave
- **Reason is REQUIRED** - request will fail without reason

---

### 3. **Get Pending Leave Requests**
**Endpoint:** `GET /api/hr/leave-requests?pending_for_me=true`

**Query Parameters:**
- `pending_for_me=true` - Get pending leaves for Manager/HR
- `status=PENDING` - Filter by status
- `employee_id=...` - Filter by employee
- `page=1` - Page number
- `limit=10` - Records per page

**Response:**
```json
{
  "success": true,
  "message": "Leave requests retrieved successfully",
  "data": {
    "requests": [
      {
        "request_id": "LR-EMP-2026-xxx-1234567890",
        "employee_id": {...},
        "employee_name": "John Doe",
        "leave_type": "CL",
        "from_date": "2026-03-07",
        "to_date": "2026-03-07",
        "days": 1,
        "reason": "Personal work",
        "status": "PENDING",
        "submitted_at": "2026-03-07T...",
        "approvers": [...]
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_records": 50
    }
  }
}
```

**Behavior:**
- **Manager:** Gets pending leaves for their team members only
- **HR/Admin:** Gets all pending leaves in their tenant
- **Employee:** Gets their own leave requests only

---

## 🔒 Permission System

### Manager Permissions
- ✅ Can approve/reject leaves of their **team members only**
- ✅ Can see pending leaves for their team: `GET /api/hr/leave-requests?pending_for_me=true`
- ❌ Cannot approve/reject leaves of employees not in their team

### HR/Admin Permissions
- ✅ Can approve/reject **any employee's leave** in their tenant
- ✅ Can see all pending leaves in tenant: `GET /api/hr/leave-requests?pending_for_me=true`
- ✅ Auto-approve when HR/Admin approves (no approval chain needed)

### Employee Permissions
- ✅ Can see their own leave requests
- ❌ Cannot approve/reject any leave requests

---

## 🔍 How It Works

### Approval Flow

1. **Employee creates leave request** → Status: `PENDING`
2. **Manager/HR sees pending request** → `GET /api/hr/leave-requests?pending_for_me=true`
3. **Manager/HR approves** → `POST /api/hr/leave-requests/:id/approve`
   - Manager: If all approvers approve → Status: `APPROVED`
   - HR/Admin: Direct approval → Status: `APPROVED`
4. **Leave ledger updated** → Leave balance deducted
5. **Dashboard shows leave status** → Employee marked as "on leave"

### Rejection Flow

1. **Employee creates leave request** → Status: `PENDING`
2. **Manager/HR sees pending request** → `GET /api/hr/leave-requests?pending_for_me=true`
3. **Manager/HR rejects with reason** → `POST /api/hr/leave-requests/:id/reject { reason: "..." }`
4. **Status updated** → Status: `REJECTED`
5. **Rejection reason saved** → Employee can see why it was rejected

---

## 🧪 Testing

### Test 1: Manager Approve Team Member Leave
```bash
# Login as Manager
TOKEN="<manager_token>"
TENANT="eyekra"

# Get pending leaves
curl -X GET "http://api.etelios.com/api/hr/leave-requests?pending_for_me=true" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT"

# Approve leave
curl -X POST "http://api.etelios.com/api/hr/leave-requests/<leave_request_id>/approve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT" \
  -H "Content-Type: application/json" \
  -d '{"comments": "Approved - work can be managed"}'
```

### Test 2: HR Reject Leave with Reason
```bash
# Login as HR
TOKEN="<hr_token>"
TENANT="eyekra"

# Reject leave
curl -X POST "http://api.etelios.com/api/hr/leave-requests/<leave_request_id>/reject" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Cannot approve due to critical project deadline"}'
```

### Test 3: Get Pending Leaves
```bash
# Manager - sees team members' pending leaves
curl -X GET "http://api.etelios.com/api/hr/leave-requests?pending_for_me=true" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT"

# HR - sees all pending leaves in tenant
curl -X GET "http://api.etelios.com/api/hr/leave-requests?pending_for_me=true" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT"
```

---

## 📋 Frontend Integration

### Get Pending Leaves
```typescript
const getPendingLeaves = async () => {
  const response = await fetch('/api/hr/leave-requests?pending_for_me=true', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId
    }
  });
  
  const result = await response.json();
  return result.data.requests; // Array of pending leave requests
};
```

### Approve Leave
```typescript
const approveLeave = async (leaveRequestId: string, comments?: string) => {
  const response = await fetch(`/api/hr/leave-requests/${leaveRequestId}/approve`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ comments: comments || 'Approved' })
  });
  
  const result = await response.json();
  if (result.success) {
    // Refresh pending leaves list
    await getPendingLeaves();
  }
};
```

### Reject Leave
```typescript
const rejectLeave = async (leaveRequestId: string, reason: string) => {
  if (!reason || reason.trim().length === 0) {
    alert('Rejection reason is required');
    return;
  }
  
  const response = await fetch(`/api/hr/leave-requests/${leaveRequestId}/reject`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reason })
  });
  
  const result = await response.json();
  if (result.success) {
    // Refresh pending leaves list
    await getPendingLeaves();
  }
};
```

### UI Example
```typescript
const PendingLeavesList = () => {
  const [pendingLeaves, setPendingLeaves] = useState([]);
  
  useEffect(() => {
    loadPendingLeaves();
  }, []);
  
  const loadPendingLeaves = async () => {
    const leaves = await getPendingLeaves();
    setPendingLeaves(leaves);
  };
  
  const handleApprove = async (leaveId) => {
    const comments = prompt('Approval comments (optional):');
    await approveLeave(leaveId, comments);
    loadPendingLeaves();
  };
  
  const handleReject = async (leaveId) => {
    const reason = prompt('Rejection reason (required):');
    if (reason) {
      await rejectLeave(leaveId, reason);
      loadPendingLeaves();
    }
  };
  
  return (
    <div>
      <h2>Pending Leave Requests</h2>
      {pendingLeaves.map(leave => (
        <div key={leave._id}>
          <p>{leave.employee_name} - {leave.leave_type} ({leave.days} days)</p>
          <p>Reason: {leave.reason}</p>
          <button onClick={() => handleApprove(leave._id)}>Approve</button>
          <button onClick={() => handleReject(leave._id)}>Reject</button>
        </div>
      ))}
    </div>
  );
};
```

---

## ✅ Features

1. **Simple Approval:**
   - ✅ One-click approval for Manager/HR
   - ✅ Optional comments
   - ✅ Auto-updates leave ledger

2. **Rejection with Reason:**
   - ✅ Reason is mandatory
   - ✅ Reason saved in database
   - ✅ Employee can see rejection reason

3. **Pending Leaves View:**
   - ✅ Manager sees team members' pending leaves
   - ✅ HR sees all pending leaves in tenant
   - ✅ Tenant isolation applied

4. **Permission Checks:**
   - ✅ Manager can only approve/reject team members
   - ✅ HR/Admin can approve/reject anyone
   - ✅ Proper validation and error messages

---

## 🔒 Security

1. **Permission Validation:**
   - ✅ Manager can only access team members' leaves
   - ✅ HR/Admin can access all leaves in tenant
   - ✅ Tenant isolation enforced

2. **Data Validation:**
   - ✅ Rejection reason required
   - ✅ Leave request must exist
   - ✅ Cannot approve/reject already processed requests

3. **Tenant Isolation:**
   - ✅ All queries filter by tenantId
   - ✅ No cross-tenant data access

---

## 📝 Summary

### New Endpoints:
1. ✅ `POST /api/hr/leave-requests/:id/approve` - Simple approval
2. ✅ `POST /api/hr/leave-requests/:id/reject` - Rejection with reason (enhanced)
3. ✅ `GET /api/hr/leave-requests?pending_for_me=true` - Get pending leaves (enhanced)

### Enhanced Features:
1. ✅ Permission-based approval/rejection
2. ✅ Manager sees only team members' leaves
3. ✅ HR sees all pending leaves in tenant
4. ✅ Rejection reason mandatory
5. ✅ Tenant isolation applied

### Status:
- ✅ **Code Complete**
- ✅ **Deployed**
- ⏳ **Testing Required**

---

**Ready for testing!** 🚀
