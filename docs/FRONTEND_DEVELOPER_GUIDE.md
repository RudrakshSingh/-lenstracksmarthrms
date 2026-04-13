# Frontend Developer Guide - Latest Fixes

**Date:** March 2026  
**Version:** 2.0  
**Status:** ✅ Production Ready

---

## 📋 Table of Contents

1. [Leave Apply - Improved](#leave-apply-improved)
2. [Attendance Edit - New Endpoint](#attendance-edit-new-endpoint)
3. [API Examples](#api-examples)
4. [Error Handling](#error-handling)
5. [React Integration](#react-integration)

---

## 1. Leave Apply - Improved ✅

### Overview

Leave Apply functionality has been improved with better employee lookup. It now works even if `employee_id` is missing from the JWT token.

### Endpoint

```
POST /api/hr/leave-requests
```

### Headers

```javascript
{
  'Authorization': 'Bearer <access_token>',
  'X-Tenant-Id': '<tenantId>',
  'Content-Type': 'application/json'
}
```

### Request Body

```typescript
{
  // employee_id is OPTIONAL - Auto-set from logged-in user
  employee_id?: string,        // Optional - Auto-set from token
  leave_type: 'CL' | 'SL' | 'EL' | 'WO' | 'PH' | 'LWP' | 
              'MATERNITY' | 'PATERNITY' | 'BEREAVEMENT' | 
              'MARRIAGE' | 'COMP_OFF' | 'TRAINING',
  from_date: string,           // ISO date: '2026-03-10'
  to_date: string,            // ISO date: '2026-03-12'
  reason: string,              // Max 1000 characters
  half_day?: boolean,          // Default: false
  half_day_type?: 'FIRST_HALF' | 'SECOND_HALF',  // Required if half_day = true
  attachments?: Array<{
    file_name: string,
    file_url: string,
    file_type: 'MEDICAL_CERTIFICATE' | 'DOCUMENT' | 'OTHER'
  }>
}
```

### Example Request

```javascript
// Employee doesn't need to pass employee_id
const response = await fetch(`${API_BASE}/api/hr/leave-requests`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    leave_type: 'CL',
    from_date: '2026-03-10',
    to_date: '2026-03-12',
    reason: 'Personal work',
    half_day: false
  })
});

const data = await response.json();

if (data.success) {
  console.log('Leave applied successfully:', data.data);
} else {
  console.error('Error:', data.message);
}
```

### Response (Success - 201)

```typescript
{
  success: true,
  data: {
    request_id: string,
    employee_id: string,
    employee_code: string,
    employee_name: string,
    leave_type: string,
    from_date: string,
    to_date: string,
    days: number,
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED',
    reason: string,
    balance_available: number,
    balance_after: number,
    submitted_at: string,
    created_at: string
  },
  message: 'Leave request created successfully'
}
```

### Error Responses

```typescript
// 400 - Validation Error
{
  success: false,
  error: 'VALIDATION_ERROR',
  message: 'Insufficient leave balance. Available: 5, Requested: 10'
}

// 404 - Employee Not Found
{
  success: false,
  error: 'NOT_FOUND',
  message: 'Employee record not found for logged-in user'
}

// 403 - Permission Denied
{
  success: false,
  error: 'FORBIDDEN',
  message: 'You can only create leave requests for yourself'
}
```

### Improvements

✅ **Auto Employee ID Detection:**
- System automatically finds employee using multiple methods:
  1. By user._id (most reliable)
  2. By employee_id from token
  3. By email (fallback)
  4. By employee_code from token

✅ **Better Error Messages:**
- Clear error messages if employee not found
- Detailed logging for debugging

### Important Notes

⚠️ **For Admin Users:**
- If admin user has an employee record → `employee_id` is optional (auto-set)
- If admin user doesn't have an employee record → `employee_id` is **required**
- This is because admin users might not always have employee records

**Best Practice:** Always try without `employee_id` first. If you get a validation error asking for `employee_id`, then provide it.

---

## 2. Attendance Edit - New Endpoint ✅

### Overview

New PUT endpoint allows HR/Admin/Manager to edit attendance records. Employees cannot edit attendance (read-only).

### Endpoint

```
PUT /api/attendance/:id
```

### Headers

```javascript
{
  'Authorization': 'Bearer <access_token>',
  'X-Tenant-Id': '<tenantId>',
  'Content-Type': 'application/json'
}
```

### Permissions

- ✅ **HR, Admin, SuperAdmin, Manager** - Can edit
- ❌ **Employee** - Cannot edit (403 Forbidden)

### Request Body

```typescript
{
  notes?: string,                    // Optional - Update notes
  status?: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'holiday',
  check_in_time?: string,           // Optional - ISO 8601 date string
  check_out_time?: string            // Optional - ISO 8601 date string
}
```

**Note:** At least one field must be provided.

### Example Request

```javascript
// Edit attendance record
const attendanceId = '507f1f77bcf86cd799439011';

const response = await fetch(`${API_BASE}/api/attendance/${attendanceId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    notes: 'Updated attendance notes',
    status: 'present'
  })
});

const data = await response.json();

if (data.success) {
  console.log('Attendance updated:', data.data);
} else {
  console.error('Error:', data.message);
}
```

### Response (Success - 200)

```typescript
{
  success: true,
  data: {
    id: string,
    employee_id: string,
    employee: {
      _id: string,
      name: string,
      employeeId: string
    },
    date: string,
    check_in_time: string,
    check_out_time: string,
    total_hours: number,
    status: string,
    notes: string,
    store: {
      _id: string,
      name: string,
      code: string
    }
  },
  message: 'Attendance updated successfully'
}
```

### Error Responses

```typescript
// 403 - Permission Denied
{
  success: false,
  error: 'Access denied',
  message: 'Only HR/Admin can edit attendance records'
}

// 404 - Not Found
{
  success: false,
  error: 'NOT_FOUND',
  message: 'Attendance record not found'
}

// 400 - Validation Error
{
  success: false,
  error: 'VALIDATION_ERROR',
  message: 'Status must be one of: present, absent, late, half_day, on_leave, holiday'
}
```

### Features

✅ **Automatic Hours Calculation:**
- If both `check_in_time` and `check_out_time` are provided, `total_hours` is automatically calculated

✅ **Tenant Isolation:**
- Only attendance records from the same tenant can be edited

✅ **Status Validation:**
- Only valid status values are accepted

---

## 3. API Examples

### Complete Leave Apply Flow

```javascript
async function applyLeave(leaveData) {
  try {
    const token = localStorage.getItem('access_token');
    const tenantId = localStorage.getItem('tenant_id');
    
    const response = await fetch(`${API_BASE}/api/hr/leave-requests`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        leave_type: leaveData.leaveType,
        from_date: leaveData.fromDate,
        to_date: leaveData.toDate,
        reason: leaveData.reason,
        half_day: leaveData.halfDay || false,
        half_day_type: leaveData.halfDayType
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      switch (data.error) {
        case 'VALIDATION_ERROR':
          alert(data.message);
          break;
        case 'NOT_FOUND':
          alert('Employee record not found. Please contact HR.');
          break;
        case 'FORBIDDEN':
          alert('You can only create leave requests for yourself.');
          break;
        default:
          alert('An error occurred. Please try again.');
      }
      return null;
    }
    
    return data.data;
  } catch (error) {
    console.error('Leave application error:', error);
    alert('Network error. Please check your connection.');
    return null;
  }
}
```

### Complete Attendance Edit Flow

```javascript
async function editAttendance(attendanceId, updates) {
  try {
    const token = localStorage.getItem('access_token');
    const tenantId = localStorage.getItem('tenant_id');
    
    const response = await fetch(`${API_BASE}/api/attendance/${attendanceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      switch (data.error) {
        case 'Access denied':
          alert('Only HR/Admin can edit attendance records.');
          break;
        case 'NOT_FOUND':
          alert('Attendance record not found.');
          break;
        case 'VALIDATION_ERROR':
          alert(data.message);
          break;
        default:
          alert('An error occurred. Please try again.');
      }
      return null;
    }
    
    return data.data;
  } catch (error) {
    console.error('Attendance edit error:', error);
    alert('Network error. Please check your connection.');
    return null;
  }
}

// Usage
await editAttendance('507f1f77bcf86cd799439011', {
  notes: 'Updated notes',
  status: 'present',
  check_in_time: '2026-03-07T09:00:00Z',
  check_out_time: '2026-03-07T18:00:00Z'
});
```

---

## 4. Error Handling

### Common Error Codes

| Error Code | Status | Description |
|------------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `NOT_FOUND` | 404 | Resource not found |
| `FORBIDDEN` | 403 | Permission denied |
| `UNAUTHORIZED` | 401 | Authentication required |
| `ALREADY_EXISTS` | 409 | Resource already exists |

### Error Handling Pattern

```javascript
async function handleApiCall(apiCall) {
  try {
    const response = await apiCall();
    const data = await response.json();
    
    if (!response.ok) {
      // Handle specific errors
      if (response.status === 401) {
        // Redirect to login
        window.location.href = '/login';
        return null;
      }
      
      if (response.status === 403) {
        // Show permission error
        alert('You do not have permission to perform this action.');
        return null;
      }
      
      // Show error message
      alert(data.message || 'An error occurred');
      return null;
    }
    
    return data.data;
  } catch (error) {
    console.error('API Error:', error);
    alert('Network error. Please check your connection.');
    return null;
  }
}
```

---

## 5. React Integration

### Custom Hook for Leave Management

```typescript
// hooks/useLeaveManagement.ts
import { useState } from 'react';
import { useAuth } from './useAuth';

export function useLeaveManagement() {
  const { token, tenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyLeave = async (leaveData: {
    leave_type: string;
    from_date: string;
    to_date: string;
    reason: string;
    half_day?: boolean;
    half_day_type?: string;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/hr/leave-requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(leaveData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.message || 'Failed to apply leave');
        return null;
      }
      
      return data.data;
    } catch (err) {
      setError('Network error. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { applyLeave, loading, error };
}
```

### Custom Hook for Attendance Edit

```typescript
// hooks/useAttendanceEdit.ts
import { useState } from 'react';
import { useAuth } from './useAuth';

export function useAttendanceEdit() {
  const { token, tenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editAttendance = async (
    attendanceId: string,
    updates: {
      notes?: string;
      status?: string;
      check_in_time?: string;
      check_out_time?: string;
    }
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/attendance/${attendanceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 403) {
          setError('Only HR/Admin can edit attendance records');
        } else {
          setError(data.message || 'Failed to update attendance');
        }
        return null;
      }
      
      return data.data;
    } catch (err) {
      setError('Network error. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { editAttendance, loading, error };
}
```

### React Component Example

```typescript
// components/LeaveApplicationForm.tsx
import { useState } from 'react';
import { useLeaveManagement } from '../hooks/useLeaveManagement';

export function LeaveApplicationForm() {
  const { applyLeave, loading, error } = useLeaveManagement();
  const [formData, setFormData] = useState({
    leave_type: 'CL',
    from_date: '',
    to_date: '',
    reason: '',
    half_day: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await applyLeave(formData);
    
    if (result) {
      alert('Leave applied successfully!');
      // Reset form or redirect
      setFormData({
        leave_type: 'CL',
        from_date: '',
        to_date: '',
        reason: '',
        half_day: false
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      
      <select
        value={formData.leave_type}
        onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
        required
      >
        <option value="CL">Casual Leave</option>
        <option value="SL">Sick Leave</option>
        <option value="EL">Earned Leave</option>
      </select>
      
      <input
        type="date"
        value={formData.from_date}
        onChange={(e) => setFormData({ ...formData, from_date: e.target.value })}
        required
      />
      
      <input
        type="date"
        value={formData.to_date}
        onChange={(e) => setFormData({ ...formData, to_date: e.target.value })}
        required
      />
      
      <textarea
        value={formData.reason}
        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
        placeholder="Reason for leave"
        required
      />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Applying...' : 'Apply for Leave'}
      </button>
    </form>
  );
}
```

```typescript
// components/AttendanceEditForm.tsx
import { useState } from 'react';
import { useAttendanceEdit } from '../hooks/useAttendanceEdit';

interface AttendanceEditFormProps {
  attendanceId: string;
  onSuccess?: () => void;
}

export function AttendanceEditForm({ attendanceId, onSuccess }: AttendanceEditFormProps) {
  const { editAttendance, loading, error } = useAttendanceEdit();
  const [formData, setFormData] = useState({
    notes: '',
    status: 'present',
    check_in_time: '',
    check_out_time: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates: any = {};
    if (formData.notes) updates.notes = formData.notes;
    if (formData.status) updates.status = formData.status;
    if (formData.check_in_time) updates.check_in_time = formData.check_in_time;
    if (formData.check_out_time) updates.check_out_time = formData.check_out_time;
    
    const result = await editAttendance(attendanceId, updates);
    
    if (result) {
      alert('Attendance updated successfully!');
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      
      <textarea
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        placeholder="Notes"
      />
      
      <select
        value={formData.status}
        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
      >
        <option value="present">Present</option>
        <option value="absent">Absent</option>
        <option value="late">Late</option>
        <option value="half_day">Half Day</option>
        <option value="on_leave">On Leave</option>
        <option value="holiday">Holiday</option>
      </select>
      
      <input
        type="datetime-local"
        value={formData.check_in_time}
        onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
        placeholder="Check In Time"
      />
      
      <input
        type="datetime-local"
        value={formData.check_out_time}
        onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })}
        placeholder="Check Out Time"
      />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Updating...' : 'Update Attendance'}
      </button>
    </form>
  );
}
```

---

## 6. Testing Checklist

### Leave Apply
- [ ] Employee can apply leave without passing employee_id
- [ ] Leave request is created successfully
- [ ] Error handling works for validation errors
- [ ] Error handling works for employee not found

### Attendance Edit
- [ ] HR/Admin can edit attendance
- [ ] Employee cannot edit (403 error)
- [ ] Notes can be updated
- [ ] Status can be updated
- [ ] Check-in/out times can be updated
- [ ] Total hours are recalculated automatically
- [ ] Tenant isolation is enforced

---

## 7. Base URLs

### Production
```
https://api.etelios.com
```

### Development
```
http://localhost:3002
```

---

## 8. Important Notes

### Leave Apply
- ✅ `employee_id` is **OPTIONAL** - Auto-set from logged-in user
- ✅ Works even if employee_id is missing from JWT token
- ✅ System finds employee using multiple fallback methods

### Attendance Edit
- ✅ Only HR/Admin/Manager can edit
- ✅ Employees get 403 Forbidden
- ✅ At least one field must be provided in request body
- ✅ Total hours are automatically recalculated if both times are provided
- ✅ Tenant isolation is enforced

---

## 📞 Support

For issues or questions:
1. Check error messages in response
2. Check browser console for detailed errors
3. Verify token and tenant ID are correct
4. Check network tab for request/response details

---

**Last Updated:** March 2026  
**Version:** 2.0  
**Status:** ✅ Production Ready
