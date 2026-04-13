# Leave Management System - Complete Frontend Developer Guide

**Version:** 2.0  
**Last Updated:** March 2026  
**Status:** Production Ready ✅

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication & Headers](#authentication--headers)
3. [Core Leave Operations](#core-leave-operations)
4. [Leave Balance & Policy](#leave-balance--policy)
5. [Leave Applications](#leave-applications)
6. [Approval & Rejection](#approval--rejection)
7. [Holidays & Blackout](#holidays--blackout)
8. [Workflow Configuration](#workflow-configuration)
9. [Reports & Analytics](#reports--analytics)
10. [Notification Settings](#notification-settings)
11. [Error Handling](#error-handling)
12. [React Integration Examples](#react-integration-examples)
13. [Testing Checklist](#testing-checklist)

---

## 1. Overview

The Leave Management System provides comprehensive leave request, approval, and tracking capabilities. All endpoints are tenant-isolated and require authentication.

### Base URLs
- **Production:** `https://api.etelios.com` or `http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com`
- **Development:** `http://localhost:3002`

### Key Features
- ✅ Employee leave application
- ✅ Manager/HR approval/rejection
- ✅ Leave balance tracking
- ✅ Holiday management
- ✅ Blackout periods
- ✅ Approval workflows
- ✅ Reports & analytics
- ✅ Notification settings

---

## 2. Authentication & Headers

### Required Headers (All Requests)

```javascript
{
  'Authorization': 'Bearer <access_token>',
  'X-Tenant-Id': '<tenantId>',
  'Content-Type': 'application/json'
}
```

### Getting Access Token

```javascript
// Login endpoint
POST /api/auth/login
Body: { email: string, password: string }

Response: {
  success: true,
  data: {
    accessToken: string,
    user: {
      tenantId: string,
      employeeId: string,
      role: string
    }
  }
}
```

### Token Storage

Store the `accessToken` in:
- `localStorage.access_token` (for browser)
- Auth store/context (React)
- Secure storage (mobile apps)

---

## 3. Core Leave Operations

### 3.1 Create Leave Request

**Endpoint:** `POST /api/hr/leave-requests`

**Purpose:** Employee creates a leave request for themselves. HR/Admin can create for any employee.

**Request Body:**
```typescript
{
  employee_id?: string,        // Optional for employees (auto-set from token)
  leave_type: 'CL' | 'SL' | 'EL' | 'WO' | 'PH' | 'LWP' | 'MATERNITY' | 'PATERNITY' | 'BEREAVEMENT' | 'MARRIAGE' | 'COMP_OFF' | 'TRAINING',
  from_date: string,           // ISO date: 'YYYY-MM-DD'
  to_date: string,             // ISO date: 'YYYY-MM-DD'
  reason: string,              // Required, max 1000 chars
  half_day?: boolean,          // Default: false
  half_day_type?: 'FIRST_HALF' | 'SECOND_HALF',
  attachments?: Array<{        // Optional
    file_name: string,
    file_url: string,
    file_type: 'MEDICAL_CERTIFICATE' | 'DOCUMENT' | 'OTHER'
  }>
}
```

**Response (201):**
```typescript
{
  success: true,
  data: {
    _id: string,
    request_id: string,
    employee_id: string,
    leave_type: string,
    from_date: string,
    to_date: string,
    days: number,
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED',
    balance_available: number,
    balance_after: number,
    submitted_at: string
  },
  message: 'Leave request created successfully'
}
```

**Employee Example:**
```javascript
// Employee doesn't need to send employee_id - it's auto-set from token
const response = await fetch('/api/hr/leave-requests', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    leave_type: 'CL',
    from_date: '2026-03-15',
    to_date: '2026-03-17',
    reason: 'Personal work',
    half_day: false
  })
});
```

**Error Responses:**
- `400` - Validation error (missing fields, invalid dates)
- `403` - Employee trying to create for someone else
- `404` - Employee not found
- `400` - Insufficient leave balance
- `400` - Leave falls on blackout dates

---

### 3.2 Get Leave Requests

**Endpoint:** `GET /api/hr/leave-requests`

**Query Parameters:**
```typescript
{
  employee_id?: string,       // Filter by employee
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED',
  leave_type?: string,
  page?: number,              // Default: 1
  limit?: number,             // Default: 10
  pending_for_me?: 'true'    // For managers: show team's pending requests
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    requests: Array<{
      _id: string,
      request_id: string,
      employee_id: {
        _id: string,
        employeeId: string,
        fullName: string
      },
      leave_type: string,
      from_date: string,
      to_date: string,
      days: number,
      status: string,
      reason: string,
      submitted_at: string,
      approved_at?: string,
      rejected_at?: string
    }>,
    pagination: {
      current_page: number,
      total_pages: number,
      total_records: number
    }
  }
}
```

**Example:**
```javascript
// Get employee's own leave requests
const response = await fetch(`/api/hr/leave-requests?employee_id=${employeeId}&status=PENDING`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId
  }
});

// Manager: Get team's pending requests
const response = await fetch(`/api/hr/leave-requests?pending_for_me=true`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId
  }
});
```

---

### 3.3 Get Leave Request by ID

**Endpoint:** `GET /api/hr/leave-requests/:id`

**Response (200):**
```typescript
{
  success: true,
  data: {
    _id: string,
    request_id: string,
    employee_id: object,
    leave_type: string,
    from_date: string,
    to_date: string,
    days: number,
    status: string,
    reason: string,
    approvers: Array<{
      approver_id: string,
      approver_name: string,
      level: number,
      status: string,
      approved_at?: string,
      comments?: string
    }>,
    balance_available: number,
    balance_after: number
  }
}
```

---

### 3.4 Cancel Leave Request

**Endpoint:** `POST /api/hr/leave-requests/:id/cancel`

**Request Body (Optional):**
```typescript
{
  cancellation_reason?: string
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    _id: string,
    status: 'CANCELLED',
    cancelled_at: string
  },
  message: 'Leave request cancelled successfully'
}
```

**Note:** Employees can only cancel their own pending requests. HR/Admin can cancel any request.

---

## 4. Leave Balance & Policy

### 4.1 Get Leave Balance

**Endpoint:** `GET /api/hr/leaves/balance`

**Query Parameters:**
```typescript
{
  employeeId: string,         // Required
  leaveYear?: number          // Optional, default: current year
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    employee: string,
    employeeId: string,
    casualLeave: {
      total: number,
      used: number,
      available: number
    },
    sickLeave: {
      total: number,
      used: number,
      available: number
    },
    earnedLeave: {
      total: number,
      used: number,
      available: number
    }
  }
}
```

**Example:**
```javascript
const response = await fetch(`/api/hr/leaves/balance?employeeId=${employeeId}`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId
  }
});
```

---

### 4.2 Get Leave Policy

**Endpoint:** `GET /api/hr/policies/leave`

**Query Parameters:**
```typescript
{
  employee_id?: string         // Optional, defaults to logged-in user
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    leaveTypes: Array<{
      id: string,
      code: string,            // 'CL', 'SL', 'EL', etc.
      name: string,            // 'Casual Leave', 'Sick Leave', etc.
      annualAllocation: number,
      accrual: string,         // 'Monthly 1.25/day' or 'Annual Fixed'
      carryForward: number,
      maxContinuous: number,
      active: boolean
    }>
  }
}
```

---

### 4.3 Get Leave Applications

**Endpoint:** `GET /api/hr/leaves/applications`

**Query Parameters:**
```typescript
{
  employeeId: string           // Required
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    requests: Array<LeaveRequest>,
    pagination: {
      current_page: number,
      total_pages: number,
      total_records: number
    }
  }
}
```

---

### 4.4 Get Leave Ledger

**Endpoint:** `GET /api/hr/leave-ledger`

**Query Parameters:**
```typescript
{
  employeeId?: string,         // Optional, defaults to logged-in user
  year?: number               // Optional, default: current year
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    employee: string,
    year: number,
    leaveTypes: Array<{
      leave_type: string,
      opening: number,
      credited: number,
      debited: number,
      closing: number,
      transactions: Array<{
        date: string,
        type: 'CREDIT' | 'DEBIT',
        amount: number,
        description: string
      }>
    }>
  }
}
```

---

## 5. Approval & Rejection

### 5.1 Approve Leave Request

**Endpoint:** `POST /api/hr/leave-requests/:id/approve`

**Alternative:** `POST /api/hr/leaves/:id/approve`

**Request Body (Optional):**
```typescript
{
  comments?: string           // Approval comments
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    _id: string,
    status: 'APPROVED',
    approved_at: string,
    approvers: Array<Approver>
  },
  message: 'Leave request approved successfully'
}
```

**Access:** HR, Admin, Manager (can approve team members' requests)

---

### 5.2 Reject Leave Request

**Endpoint:** `POST /api/hr/leave-requests/:id/reject`

**Alternative:** `POST /api/hr/leaves/:id/reject`

**Request Body (Optional):**
```typescript
{
  comments?: string,          // Rejection reason
  reason?: string
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    _id: string,
    status: 'REJECTED',
    rejected_at: string,
    rejection_reason: string
  },
  message: 'Leave request rejected successfully'
}
```

---

### 5.3 Bulk Approve/Reject

**Endpoint:** `POST /api/hr/leaves/bulk-action`

**Request Body:**
```typescript
{
  ids: string[],              // Array of leave request IDs
  action: 'approve' | 'reject',
  comment?: string
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    processed: number,
    succeeded: string[],      // Array of successful IDs
    failed?: Array<{          // Optional, only if some failed
      id: string,
      reason: string
    }>
  },
  message: 'Bulk approve completed: 5 succeeded, 0 failed'
}
```

**Example:**
```javascript
const response = await fetch('/api/hr/leaves/bulk-action', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    ids: ['req1', 'req2', 'req3'],
    action: 'approve',
    comment: 'Bulk approved by HR'
  })
});
```

---

## 6. Quick Leave Operations

### 6.1 Mark Leave for Today

**Endpoint:** `POST /api/hr/leave/mark-today`

**Purpose:** Quickly mark an employee on leave for today without full application form.

**Request Body:**
```typescript
{
  employeeId?: string,        // Optional - defaults to logged-in user
  leaveType?: 'CL',           // Optional - defaults to 'CL'
  reason?: string             // Optional - defaults to 'On leave today'
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    leaveRequest: {
      request_id: string,
      leave_type: string,
      from_date: string,      // Today's date
      to_date: string,        // Today's date
      days: 1,
      status: 'APPROVED' | 'PENDING'  // APPROVED if marked by HR/Admin, PENDING if by employee
    }
  }
}
```

**Access:**
- **HR/Admin/Manager:** Can mark any employee (auto-approved)
- **Employee:** Can only mark themselves (status: PENDING, requires approval)

---

## 7. Holidays & Blackout

### 7.1 Get Holidays

**Endpoint:** `GET /api/hr/holidays`

**Query Parameters:**
```typescript
{
  year: number,               // Required, e.g. 2026
  storeId?: string,           // Optional
  region?: string             // Optional
}
```

**Response (200):**
```typescript
{
  success: true,
  data: Array<{
    id: string,
    date: string,             // 'YYYY-MM-DD'
    name: string,
    type: 'National' | 'Regional' | 'Religious' | 'Company',
    applicableTo: string,
    store?: {
      id: string,
      name: string
    }
  }>
}
```

---

### 7.2 Create Holiday

**Endpoint:** `POST /api/hr/holidays`

**Request Body:**
```typescript
{
  date: string,               // 'YYYY-MM-DD'
  name: string,
  type?: 'National' | 'Regional' | 'Religious' | 'Company',
  applicableTo?: string,      // Default: 'All Stores'
  storeId?: string,
  region?: string,
  state?: string
}
```

**Access:** HR, Admin only

---

### 7.3 Update Holiday

**Endpoint:** `PUT /api/hr/holidays/:id`

**Request Body:** Same as create

**Access:** HR, Admin only

---

### 7.4 Get Blackout Periods

**Endpoint:** `GET /api/hr/leave/blackout`

**Query Parameters:**
```typescript
{
  year?: number,
  leaveType?: string
}
```

**Response (200):**
```typescript
{
  success: true,
  data: Array<{
    id: string,
    startDate: string,        // 'YYYY-MM-DD'
    endDate: string,
    description: string,
    applicableTo: string,
    leaveTypes: string[],     // ['CL', 'EL']
    departments: Array<Department>,
    stores: Array<Store>
  }>
}
```

---

### 7.5 Create Blackout Period

**Endpoint:** `POST /api/hr/leave/blackout`

**Request Body:**
```typescript
{
  startDate: string,          // 'YYYY-MM-DD'
  endDate: string,
  description: string,
  applicableTo?: string,      // Default: 'All Employees'
  leaveTypes?: string[],      // Default: ['CL', 'EL']
  departmentIds?: string[],
  storeIds?: string[],
  requiresAreaManagerApproval?: boolean
}
```

**Access:** HR, Admin only

---

## 8. Workflow Configuration

### 8.1 Get Workflow Config

**Endpoint:** `GET /api/hr/leave/workflow`

**Response (200):**
```typescript
{
  success: true,
  data: {
    steps: Array<{
      id: number,
      name: string,           // 'Reporting Manager', 'HR Manager'
      required: boolean,
      autoApprove: boolean,
      timeLimit: number,      // Hours
      timeoutAction: 'Escalate' | 'Auto-approve' | 'Auto-reject'
    }>,
    parallelApprovals: boolean,
    requireAllApprovals: boolean
  }
}
```

---

### 8.2 Save Workflow Config

**Endpoint:** `PUT /api/hr/leave/workflow`

**Request Body:**
```typescript
{
  steps: Array<{
    id: number,
    name: string,
    required: boolean,
    autoApprove: boolean,
    timeLimit: number,
    timeoutAction: string
  }>,
  parallelApprovals?: boolean,
  requireAllApprovals?: boolean
}
```

**Access:** HR, Admin only

---

## 9. Reports & Analytics

### 9.1 Generate Leave Report

**Endpoint:** `GET /api/hr/leave/reports`

**Query Parameters:**
```typescript
{
  reportType: 'monthly-utilization' | 'department-wise' | 'employee-wise' | 'approval-time',
  period: string,             // Required: 'YYYY-MM' (e.g., '2026-03')
  department?: string         // Optional: 'all' or department ID
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    summary?: {
      totalApplications: number,
      approved: number,
      rejected: number,
      averageDays?: number,
      averageApprovalTimeHours?: number
    },
    rows: Array<{
      employeeId?: string,
      employeeName?: string,
      department?: string,
      leaveType?: string,
      startDate?: string,
      endDate?: string,
      days?: number,
      status?: string,
      appliedOn?: string,
      approvedOn?: string,
      approvalTimeHours?: number
    }>
  }
}
```

**Example:**
```javascript
const response = await fetch('/api/hr/leave/reports?reportType=monthly-utilization&period=2026-03&department=all', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId
  }
});
```

---

## 10. Notification Settings

### 10.1 Get Notification Settings

**Endpoint:** `GET /api/hr/leave/notification-settings`

**Response (200):**
```typescript
{
  success: true,
  data: {
    employee: {
      applicationSubmitted: boolean,
      applicationApproved: boolean,
      applicationRejected: boolean,
      balanceUpdated: boolean,
      balanceLow: boolean,
      balanceExpiring: boolean,
      upcomingReminder: boolean
    },
    employeeChannels: {
      email: boolean,
      sms: boolean,
      inApp: boolean,
      push: boolean
    },
    manager: {
      requiresApproval: boolean,
      pending24Hours: boolean,
      approvedByEmployee: boolean,
      teamMemberApplied: boolean,
      multipleOnLeave: boolean
    },
    hr: {
      allNewApplications: boolean,
      urgentApprovals: boolean,
      lowBalance: boolean,
      monthlyReport: boolean,
      blackoutApproaching: boolean
    },
    dailyDigest: {
      enabled: boolean,
      time: string           // 'HH:mm' (e.g., '09:00')
    }
  }
}
```

---

### 10.2 Save Notification Settings

**Endpoint:** `PUT /api/hr/leave/notification-settings`

**Request Body:** Same structure as get response (partial updates allowed)

**Access:** HR, Admin only

---

## 11. Error Handling

### Common Error Responses

```typescript
{
  success: false,
  message: string,
  error: string              // Error code
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Missing or invalid request data |
| `NOT_FOUND` | 404 | Resource not found |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `ALREADY_EXISTS` | 400 | Resource already exists |
| `ALREADY_PROCESSED` | 400 | Leave request already approved/rejected |
| `INSUFFICIENT_BALANCE` | 400 | Not enough leave balance |
| `BLACKOUT_DATE` | 400 | Leave falls on blackout period |

### Error Handling Example

```javascript
try {
  const response = await fetch('/api/hr/leave-requests', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(leaveData)
  });
  
  const result = await response.json();
  
  if (!result.success) {
    switch (result.error) {
      case 'VALIDATION_ERROR':
        // Show validation errors
        break;
      case 'INSUFFICIENT_BALANCE':
        // Show balance error
        break;
      case 'FORBIDDEN':
        // Show permission error
        break;
      default:
        // Show generic error
    }
  }
} catch (error) {
  // Handle network errors
}
```

---

## 12. React Integration Examples

### 12.1 Custom Hook: useLeaveManagement

```typescript
import { useState, useEffect } from 'react';

interface LeaveRequest {
  _id: string;
  request_id: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  days: number;
  status: string;
  reason: string;
}

export function useLeaveManagement() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const token = localStorage.getItem('access_token');
  const tenantId = localStorage.getItem('tenantId');
  
  const fetchLeaveRequests = async (employeeId?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const url = employeeId 
        ? `/api/hr/leave-requests?employee_id=${employeeId}`
        : '/api/hr/leave-requests';
        
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId || 'default'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        setLeaveRequests(result.data.requests || result.data || []);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };
  
  const createLeaveRequest = async (data: Partial<LeaveRequest>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/hr/leave-requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId || 'default',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchLeaveRequests();
        return result.data;
      } else {
        setError(result.message);
        throw new Error(result.message);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  const approveLeaveRequest = async (id: string, comments?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/hr/leave-requests/${id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId || 'default',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comments })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchLeaveRequests();
        return result.data;
      } else {
        setError(result.message);
        throw new Error(result.message);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  const rejectLeaveRequest = async (id: string, reason?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/hr/leave-requests/${id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId || 'default',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchLeaveRequests();
        return result.data;
      } else {
        setError(result.message);
        throw new Error(result.message);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    leaveRequests,
    loading,
    error,
    fetchLeaveRequests,
    createLeaveRequest,
    approveLeaveRequest,
    rejectLeaveRequest
  };
}
```

### 12.2 Leave Application Form Component

```typescript
import React, { useState } from 'react';
import { useLeaveManagement } from './hooks/useLeaveManagement';

export function LeaveApplicationForm() {
  const { createLeaveRequest, loading, error } = useLeaveManagement();
  const [formData, setFormData] = useState({
    leave_type: 'CL',
    from_date: '',
    to_date: '',
    reason: '',
    half_day: false
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createLeaveRequest(formData);
      alert('Leave request submitted successfully!');
      // Reset form
      setFormData({
        leave_type: 'CL',
        from_date: '',
        to_date: '',
        reason: '',
        half_day: false
      });
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
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
      
      <label>
        <input
          type="checkbox"
          checked={formData.half_day}
          onChange={(e) => setFormData({ ...formData, half_day: e.target.checked })}
        />
        Half Day
      </label>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Leave Request'}
      </button>
      
      {error && <div className="error">{error}</div>}
    </form>
  );
}
```

### 12.3 Leave Balance Widget

```typescript
import React, { useEffect, useState } from 'react';

interface LeaveBalance {
  casualLeave: { total: number; used: number; available: number };
  sickLeave: { total: number; used: number; available: number };
  earnedLeave: { total: number; used: number; available: number };
}

export function LeaveBalanceWidget({ employeeId }: { employeeId: string }) {
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const tenantId = localStorage.getItem('tenantId');
        
        const response = await fetch(`/api/hr/leaves/balance?employeeId=${employeeId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Id': tenantId || 'default'
          }
        });
        
        const result = await response.json();
        
        if (result.success) {
          setBalance(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch leave balance:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBalance();
  }, [employeeId]);
  
  if (loading) return <div>Loading...</div>;
  if (!balance) return <div>No balance data</div>;
  
  return (
    <div className="leave-balance-widget">
      <h3>Leave Balance</h3>
      <div>
        <div>
          <strong>Casual Leave:</strong>
          <span>{balance.casualLeave.available} / {balance.casualLeave.total}</span>
        </div>
        <div>
          <strong>Sick Leave:</strong>
          <span>{balance.sickLeave.available} / {balance.sickLeave.total}</span>
        </div>
        <div>
          <strong>Earned Leave:</strong>
          <span>{balance.earnedLeave.available} / {balance.earnedLeave.total}</span>
        </div>
      </div>
    </div>
  );
}
```

---

## 13. Testing Checklist

### Employee Flow
- [ ] Login as employee
- [ ] View leave balance
- [ ] View leave policy
- [ ] Create leave request (without employee_id)
- [ ] View own leave requests
- [ ] Cancel own pending request
- [ ] Mark leave for today

### Manager Flow
- [ ] Login as manager
- [ ] View team's pending leave requests
- [ ] Approve leave request
- [ ] Reject leave request with reason
- [ ] Bulk approve/reject

### HR/Admin Flow
- [ ] Login as HR/Admin
- [ ] View all leave requests
- [ ] Create leave request for any employee
- [ ] Approve/reject any leave request
- [ ] Manage holidays
- [ ] Manage blackout periods
- [ ] Configure workflow
- [ ] Generate reports
- [ ] Manage notification settings

### Edge Cases
- [ ] Create leave with insufficient balance
- [ ] Create leave on blackout dates
- [ ] Create leave without policy (should use defaults)
- [ ] Approve already approved request
- [ ] Cancel already processed request
- [ ] Cross-tenant access (should be blocked)

---

## 📚 Additional Resources

- **API Base URL:** `https://api.etelios.com`
- **Backend Implementation Status:** See `LEAVE_API_IMPLEMENTATION_COMPLETE.md`
- **Extra Endpoints:** See `BACKEND_LEAVE_ENDPOINTS_FOR_FRONTEND.md`

---

**Document Version:** 2.0  
**Last Updated:** March 2026  
**Status:** Production Ready ✅
