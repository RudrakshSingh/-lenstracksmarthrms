# Frontend Developer Quick Start Guide

**Date:** March 2026  
**Quick Reference for Latest Fixes**

---

## 🚀 Quick Start

### 1. Leave Apply (Improved)

```javascript
// Simple Leave Apply - No employee_id needed!
const applyLeave = async (leaveData) => {
  const response = await fetch(`${API_BASE}/api/hr/leave-requests`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      leave_type: 'CL',
      from_date: '2026-03-10',  // YYYY-MM-DD format
      to_date: '2026-03-12',    // YYYY-MM-DD format
      reason: 'Personal work'
      // employee_id is OPTIONAL - auto-set from token
    })
  });
  
  return await response.json();
};
```

**Key Points:**
- ✅ `employee_id` is **OPTIONAL** - Auto-set from logged-in user
- ✅ Works even if employee_id missing from token
- ✅ Date format: `YYYY-MM-DD` (e.g., '2026-03-10')

---

### 2. Attendance Edit (New)

```javascript
// Edit Attendance - HR/Admin only
const editAttendance = async (attendanceId, updates) => {
  const response = await fetch(`${API_BASE}/api/attendance/${attendanceId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      notes: 'Updated notes',        // Optional
      status: 'present',             // Optional: present|absent|late|half_day|on_leave|holiday
      check_in_time: '2026-03-07T09:00:00Z',  // Optional: ISO 8601
      check_out_time: '2026-03-07T18:00:00Z'  // Optional: ISO 8601
    })
  });
  
  return await response.json();
};
```

**Key Points:**
- ✅ Only HR/Admin/Manager can edit
- ✅ Employees get 403 Forbidden
- ✅ At least one field must be provided
- ✅ Total hours auto-calculated if both times provided

---

## 📝 Common Patterns

### Error Handling

```javascript
const handleApiResponse = async (response) => {
  const data = await response.json();
  
  if (!response.ok) {
    switch (response.status) {
      case 400:
        alert(data.message || 'Validation error');
        break;
      case 401:
        // Redirect to login
        window.location.href = '/login';
        break;
      case 403:
        alert('Permission denied');
        break;
      case 404:
        alert('Resource not found');
        break;
      default:
        alert('An error occurred');
    }
    return null;
  }
  
  return data.data;
};
```

### React Hook Example

```typescript
// useLeaveApply.ts
export function useLeaveApply() {
  const { token, tenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = async (leaveData: {
    leave_type: string;
    from_date: string;
    to_date: string;
    reason: string;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_BASE}/api/hr/leave-requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(leaveData)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.message);
        return null;
      }
      
      return data.data;
    } catch (err) {
      setError('Network error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { apply, loading, error };
}
```

---

## 🔗 Full Documentation

For complete documentation, see:
- **`docs/FRONTEND_DEVELOPER_GUIDE.md`** - Complete API reference
- **`docs/FRONTEND_LEAVE_MANAGEMENT_UPDATED.md`** - Leave management details

---

**Last Updated:** March 2026
