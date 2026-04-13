# Leave Management System - Updated Frontend Developer Guide

**Version:** 3.0  
**Last Updated:** March 7, 2026  
**Status:** ✅ Production Ready & Tested  
**Deployment:** ✅ Deployed to Production

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Recent Updates & Fixes](#recent-updates--fixes)
3. [Authentication & Headers](#authentication--headers)
4. [Core Leave Operations](#core-leave-operations)
5. [Leave Balance & Policy](#leave-balance--policy)
6. [Leave Applications](#leave-applications)
7. [Approval & Rejection](#approval--rejection)
8. [Holidays & Blackout Periods](#holidays--blackout-periods)
9. [Workflow Configuration](#workflow-configuration)
10. [Reports & Analytics](#reports--analytics)
11. [Notification Settings](#notification-settings)
12. [Error Handling](#error-handling)
13. [React Integration Examples](#react-integration-examples)
14. [Testing Checklist](#testing-checklist)
15. [Production URLs](#production-urls)

---

## 1. Overview

The Leave Management System provides comprehensive leave request, approval, and tracking capabilities with full tenant isolation and role-based access control.

### Base URLs

- **Production:** 
  - `https://api.etelios.com` (if DNS configured)
  - `http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com` (Direct ALB)
- **Development:** `http://localhost:3002`

### Key Features

- ✅ Employee leave application (with auto employee_id)
- ✅ Manager/HR approval/rejection
- ✅ Leave balance tracking
- ✅ Holiday management
- ✅ Blackout periods
- ✅ Approval workflows
- ✅ Reports & analytics
- ✅ Notification settings
- ✅ Tenant isolation
- ✅ Role-based access (Employee, Manager, HR, Admin)

---

## 2. Recent Updates & Fixes

### ✅ March 7, 2026 Updates

#### 1. **Manager Role Support**
- ✅ Managers can now create leave requests
- ✅ Managers can approve/reject leave for their team members
- ✅ Manager role added to all relevant endpoints

#### 2. **Auto Employee ID**
- ✅ `employee_id` is now **optional** in request body
- ✅ Automatically set from logged-in user's token
- ✅ Works for employees, managers, HR, and admin
- ✅ No need to pass `employee_id` explicitly for self-requests

#### 3. **Leave Policy Optional**
- ✅ Leave application works even if no active leave policy is configured
- ✅ Uses default leave type configurations
- ✅ Prevents "No active leave policy found" errors

#### 4. **Tenant Isolation**
- ✅ All leave requests are tenant-isolated
- ✅ Cross-tenant data access prevented
- ✅ `tenantId` automatically extracted from token

#### 5. **Simplified Leave Application**
- ✅ New `mark-today` endpoint for quick leave application
- ✅ No need to specify date ranges for single-day leaves
- ✅ Auto-approval for HR/Admin marked leaves

---

## 3. Authentication & Headers

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
Body: { 
  email: string, 
  password: string 
}

Response: {
  success: true,
  data: {
    accessToken: string,
    user: {
      tenantId: string,
      employeeId: string,
      role: 'employee' | 'manager' | 'hr' | 'admin'
    }
  }
}
```

### Token Storage

Store the `accessToken` in:
- `localStorage.access_token` (for browser)
- Auth store/context (React)
- Secure storage (mobile apps)

**Important:** Always include `X-Tenant-Id` header with the tenant ID from login response.

---

## 4. Core Leave Operations

### 4.1 Create Leave Request

**Endpoint:** `POST /api/hr/leave-requests`  
**Alternative:** `POST /api/hr/leave` or `POST /api/hr/leaves`

**Purpose:** Employee creates a leave request for themselves. HR/Admin can create for any employee. Manager can create for themselves or team members.

**Roles:** `employee`, `manager`, `hr`, `admin`

**Request Body:**
```typescript
{
  employee_id?: string,        // ⚠️ OPTIONAL - Auto-set from token for employees/managers
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

**Example Request (Employee):**
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
```

**Example Request (HR/Admin for another employee):**
```javascript
// HR/Admin can pass employee_id to create for another employee
const response = await fetch(`${API_BASE}/api/hr/leave-requests`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    employee_id: '507f1f77bcf86cd799439011',  // Optional for HR/Admin
    leave_type: 'SL',
    from_date: '2026-03-15',
    to_date: '2026-03-15',
    reason: 'Sick leave',
    half_day: false
  })
});
```

**Response (201 Created):**
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

**Error Responses:**
```typescript
// 400 - Validation Error
{
  success: false,
  error: 'VALIDATION_ERROR',
  message: 'Insufficient leave balance. Available: 5, Requested: 10'
}

// 403 - Permission Denied
{
  success: false,
  error: 'INSUFFICIENT_ROLE',
  message: 'Access denied. Insufficient role privileges.'
}

// 404 - Employee Not Found
{
  success: false,
  error: 'NOT_FOUND',
  message: 'Employee record not found for logged-in user'
}
```

---

### 4.2 Mark Leave for Today (Quick Leave)

**Endpoint:** `POST /api/hr/leave/mark-today`

**Purpose:** Quick way to mark leave for today. Auto-approves if marked by HR/Admin.

**Roles:** `employee`, `manager`, `hr`, `admin`

**Request Body:**
```typescript
{
  leave_type: 'CL' | 'SL' | 'EL' | 'WO' | 'PH' | 'LWP' | 
              'MATERNITY' | 'PATERNITY' | 'BEREAVEMENT' | 
              'MARRIAGE' | 'COMP_OFF' | 'TRAINING',
  reason: string              // Max 1000 characters
}
```

**Example:**
```javascript
const response = await fetch(`${API_BASE}/api/hr/leave/mark-today`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    leave_type: 'CL',
    reason: 'Personal work'
  })
});
```

**Response (201 Created):**
```typescript
{
  success: true,
  data: {
    leaveRequest: {
      request_id: string,
      status: 'PENDING' | 'APPROVED',  // APPROVED if marked by HR/Admin
      leave_type: string,
      from_date: string,  // Today's date
      to_date: string,    // Today's date
      days: 1,
      reason: string
    }
  },
  message: 'Employee marked on leave successfully'
}
```

**Error Response (400 - Already Exists):**
```typescript
{
  success: false,
  error: 'ALREADY_EXISTS',
  message: 'Employee is already on leave for today'
}
```

---

### 4.3 Get Leave Requests

**Endpoint:** `GET /api/hr/leave-requests`  
**Alternative:** `GET /api/hr/leave` or `GET /api/hr/leaves`

**Purpose:** Get leave requests. Employees see their own, Managers see team's, HR/Admin see all.

**Roles:** `employee`, `manager`, `hr`, `admin`

**Query Parameters:**
```typescript
{
  employee_id?: string,      // Optional - auto-detected from token for employees
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED',
  leave_type?: string,
  page?: number,              // Default: 1
  limit?: number,             // Default: 10
  pending_for_me?: boolean    // For managers - show requests pending their approval
}
```

**Example (Employee - No employee_id needed):**
```javascript
// Employee doesn't need to pass employee_id
const response = await fetch(`${API_BASE}/api/hr/leave-requests`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId
  }
});
```

**Example (Manager - Get team's pending requests):**
```javascript
const response = await fetch(`${API_BASE}/api/hr/leave-requests?pending_for_me=true`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId
  }
});
```

**Response (200 OK):**
```typescript
{
  success: true,
  data: {
    requests: Array<{
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
      half_day: boolean,
      balance_available: number,
      balance_after: number,
      submitted_at: string,
      approved_at?: string,
      rejected_at?: string,
      approvers: Array<{
        level: number,
        approver_id: string,
        approver_name: string,
        status: string,
        comments?: string
      }>
    }>,
    pagination: {
      current_page: number,
      total_pages: number,
      total_records: number,
      limit: number
    }
  }
}
```

---

### 4.4 Get Leave Request by ID

**Endpoint:** `GET /api/hr/leave-requests/:id`

**Purpose:** Get details of a specific leave request.

**Roles:** `employee`, `manager`, `hr`, `admin`

**Example:**
```javascript
const response = await fetch(`${API_BASE}/api/hr/leave-requests/${requestId}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId
  }
});
```

**Response (200 OK):**
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
    status: string,
    reason: string,
    attachments: Array<{
      file_name: string,
      file_url: string,
      file_type: string
    }>,
    approvers: Array<{
      level: number,
      approver_id: string,
      approver_name: string,
      status: string,
      comments?: string,
      action_date?: string
    }>
  }
}
```

---

### 4.5 Get Leave Applications (Employee-specific)

**Endpoint:** `GET /api/hr/leaves/applications`

**Purpose:** Get leave applications for a specific employee (typically the logged-in user).

**Roles:** `employee`, `manager`, `hr`, `admin`

**Query Parameters:**
```typescript
{
  employee_id?: string,      // Optional - auto-detected from token
  status?: string,
  leave_type?: string,
  page?: number,
  limit?: number
}
```

**Example:**
```javascript
const response = await fetch(`${API_BASE}/api/hr/leaves/applications`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId
  }
});
```

**Response:** Same as Get Leave Requests

---

## 5. Leave Balance & Policy

### 5.1 Get Leave Balance

**Endpoint:** `GET /api/hr/leaves/balance`

**Purpose:** Get leave balance for an employee.

**Roles:** `employee`, `manager`, `hr`, `admin`

**Query Parameters:**
```typescript
{
  employee_id?: string,      // Optional - auto-detected from token
  year?: number              // Default: current year
}
```

**Example:**
```javascript
const response = await fetch(`${API_BASE}/api/hr/leaves/balance`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId
  }
});
```

**Response (200 OK):**
```typescript
{
  success: true,
  data: {
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
    },
    paidLeave: {
      total: number,
      used: number,
      available: number
    },
    maternityPaternityLeave: {
      total: number,
      used: number,
      available: number
    },
    compensatoryOff: {
      total: number,
      used: number,
      available: number
    },
    employeeId: string,
    leaveYear: number
  }
}
```

---

### 5.2 Get Leave Policy

**Endpoint:** `GET /api/hr/policies/leave`

**Purpose:** Get leave policy configuration for the tenant.

**Roles:** `employee`, `manager`, `hr`, `admin`

**Query Parameters:**
```typescript
{
  employee_id?: string      // Optional
}
```

**Example:**
```javascript
const response = await fetch(`${API_BASE}/api/hr/policies/leave`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId
  }
});
```

**Response (200 OK):**
```typescript
{
  success: true,
  data: {
    policy_id: string,
    name: string,
    version: string,
    leave_types: Array<{
      code: string,
      name: string,
      annualAllocation: number,
      accrual: boolean,
      carryForward: boolean,
      maxContinuous: number,
      active: boolean
    }>,
    applicable_from: string,
    is_active: boolean
  }
}
```

---

### 5.3 Get Leave Ledger

**Endpoint:** `GET /api/hr/leave-ledger`

**Purpose:** Get detailed leave ledger (transaction history) for an employee.

**Roles:** `employee`, `manager`, `hr`, `admin`

**Query Parameters:**
```typescript
{
  employee_id?: string,      // Optional - auto-detected from token
  year?: number,
  leave_type?: string
}
```

**Example:**
```javascript
const response = await fetch(`${API_BASE}/api/hr/leave-ledger`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId
  }
});
```

**Response (200 OK):**
```typescript
{
  success: true,
  data: {
    ledger: Array<{
      transaction_id: string,
      employee_id: string,
      leave_type: string,
      transaction_type: 'CREDIT' | 'DEBIT',
      days: number,
      balance_after: number,
      reference: string,      // Leave request ID
      description: string,
      transaction_date: string
    }>,
    summary: {
      opening_balance: number,
      total_credited: number,
      total_debited: number,
      closing_balance: number
    }
  }
}
```

---

## 6. Approval & Rejection

### 6.1 Approve Leave Request

**Endpoint:** `POST /api/hr/leave-requests/:id/approve`  
**Alternative:** `POST /api/hr/leaves/:id/approve`

**Purpose:** Approve a pending leave request.

**Roles:** `manager`, `hr`, `admin`

**Request Body:**
```typescript
{
  comments?: string           // Optional approval comments
}
```

**Example:**
```javascript
const response = await fetch(`${API_BASE}/api/hr/leave-requests/${requestId}/approve`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    comments: 'Approved - Enjoy your leave!'
  })
});
```

**Response (200 OK):**
```typescript
{
  success: true,
  data: {
    request_id: string,
    status: 'APPROVED',
    approved_at: string,
    approver_id: string,
    approver_name: string,
    comments?: string
  },
  message: 'Leave request approved successfully'
}
```

---

### 6.2 Reject Leave Request

**Endpoint:** `POST /api/hr/leave-requests/:id/reject`  
**Alternative:** `POST /api/hr/leaves/:id/reject`

**Purpose:** Reject a pending leave request.

**Roles:** `manager`, `hr`, `admin`

**Request Body:**
```typescript
{
  reason: string,            // Required - rejection reason
  comments?: string           // Optional additional comments
}
```

**Example:**
```javascript
const response = await fetch(`${API_BASE}/api/hr/leave-requests/${requestId}/reject`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reason: 'Insufficient leave balance',
    comments: 'Please check your leave balance and apply again.'
  })
});
```

**Response (200 OK):**
```typescript
{
  success: true,
  data: {
    request_id: string,
    status: 'REJECTED',
    rejected_at: string,
    rejector_id: string,
    rejector_name: string,
    rejection_reason: string,
    comments?: string
  },
  message: 'Leave request rejected successfully'
}
```

---

### 6.3 Bulk Approve/Reject

**Endpoint:** `POST /api/hr/leaves/bulk-action`

**Purpose:** Approve or reject multiple leave requests at once.

**Roles:** `manager`, `hr`, `admin`

**Request Body:**
```typescript
{
  request_ids: string[],      // Array of leave request IDs
  action: 'approve' | 'reject',
  reason?: string,            // Required for reject
  comments?: string
}
```

**Example:**
```javascript
const response = await fetch(`${API_BASE}/api/hr/leaves/bulk-action`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    request_ids: ['LR-001', 'LR-002', 'LR-003'],
    action: 'approve',
    comments: 'Bulk approved'
  })
});
```

**Response (200 OK):**
```typescript
{
  success: true,
  data: {
    approved: number,
    rejected: number,
    failed: Array<{
      request_id: string,
      error: string
    }>
  },
  message: 'Bulk action completed'
}
```

---

### 6.4 Cancel Leave Request

**Endpoint:** `POST /api/hr/leave-requests/:id/cancel`

**Purpose:** Cancel own leave request (only if status is PENDING).

**Roles:** `employee`, `hr`, `admin`

**Example:**
```javascript
const response = await fetch(`${API_BASE}/api/hr/leave-requests/${requestId}/cancel`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId
  }
});
```

**Response (200 OK):**
```typescript
{
  success: true,
  data: {
    request_id: string,
    status: 'CANCELLED',
    cancelled_at: string
  },
  message: 'Leave request cancelled successfully'
}
```

---

## 7. Holidays & Blackout Periods

### 7.1 Get Holidays

**Endpoint:** `GET /api/hr/holidays`

**Purpose:** Get list of holidays for the tenant.

**Roles:** `employee`, `manager`, `hr`, `admin`

**Query Parameters:**
```typescript
{
  year?: number,
  month?: number
}
```

**Example:**
```javascript
const response = await fetch(`${API_BASE}/api/hr/holidays?year=2026`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId
  }
});
```

**Response (200 OK):**
```typescript
{
  success: true,
  data: {
    holidays: Array<{
      holiday_id: string,
      name: string,
      date: string,
      type: 'NATIONAL' | 'REGIONAL' | 'COMPANY',
      applicable_to: string[],  // Employee IDs or 'ALL'
      is_active: boolean
    }>
  }
}
```

---

### 7.2 Create Holiday

**Endpoint:** `POST /api/hr/holidays`

**Purpose:** Create a new holiday (HR/Admin only).

**Roles:** `hr`, `admin`

**Request Body:**
```typescript
{
  name: string,
  date: string,              // ISO date
  type: 'NATIONAL' | 'REGIONAL' | 'COMPANY',
  applicable_to?: string[]   // Employee IDs or ['ALL']
}
```

---

### 7.3 Get Blackout Periods

**Endpoint:** `GET /api/hr/leave/blackout`

**Purpose:** Get blackout periods (when leave cannot be applied).

**Roles:** `employee`, `manager`, `hr`, `admin`

**Example:**
```javascript
const response = await fetch(`${API_BASE}/api/hr/leave/blackout`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId
  }
});
```

**Response (200 OK):**
```typescript
{
  success: true,
  data: {
    blackout_periods: Array<{
      period_id: string,
      name: string,
      from_date: string,
      to_date: string,
      reason: string,
      applicable_to: string[],
      is_active: boolean
    }>
  }
}
```

---

## 8. Workflow Configuration

### 8.1 Get Workflow Config

**Endpoint:** `GET /api/hr/leave/workflow`

**Purpose:** Get approval workflow configuration.

**Roles:** `employee`, `manager`, `hr`, `admin`

**Example:**
```javascript
const response = await fetch(`${API_BASE}/api/hr/leave/workflow`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId
  }
});
```

**Response (200 OK):**
```typescript
{
  success: true,
  data: {
    workflow_id: string,
    levels: Array<{
      level: number,
      approver_role: string,
      is_required: boolean,
      auto_approve_after_hours?: number
    }>,
    escalation_enabled: boolean,
    escalation_hours: number
  }
}
```

---

## 9. Reports & Analytics

### 9.1 Get Leave Reports

**Endpoint:** `GET /api/hr/leave/reports`

**Purpose:** Get leave analytics and reports.

**Roles:** `manager`, `hr`, `admin`

**Query Parameters:**
```typescript
{
  start_date?: string,
  end_date?: string,
  department_id?: string,
  employee_id?: string,
  leave_type?: string,
  report_type?: 'summary' | 'detailed' | 'trends'
}
```

**Example:**
```javascript
const response = await fetch(`${API_BASE}/api/hr/leave/reports?start_date=2026-01-01&end_date=2026-12-31`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId
  }
});
```

**Response (200 OK):**
```typescript
{
  success: true,
  data: {
    summary: {
      total_requests: number,
      approved: number,
      rejected: number,
      pending: number,
      total_days: number
    },
    by_leave_type: Array<{
      leave_type: string,
      count: number,
      total_days: number
    }>,
    by_department: Array<{
      department_id: string,
      department_name: string,
      total_requests: number,
      total_days: number
    }>,
    trends: Array<{
      month: string,
      requests: number,
      days: number
    }>
  }
}
```

---

## 10. Notification Settings

### 10.1 Get Notification Settings

**Endpoint:** `GET /api/hr/leave/notification-settings`

**Purpose:** Get notification preferences for leave management.

**Roles:** `employee`, `manager`, `hr`, `admin`

---

## 11. Error Handling

### Common Error Codes

```typescript
// 400 - Bad Request
{
  success: false,
  error: 'VALIDATION_ERROR',
  message: 'Insufficient leave balance. Available: 5, Requested: 10'
}

// 401 - Unauthorized
{
  success: false,
  error: 'UNAUTHORIZED',
  message: 'Authentication required'
}

// 403 - Forbidden
{
  success: false,
  error: 'INSUFFICIENT_ROLE' | 'INSUFFICIENT_PERMISSION',
  message: 'Access denied. Insufficient role privileges.',
  required: ['hr', 'admin'],
  current: 'employee'
}

// 404 - Not Found
{
  success: false,
  error: 'NOT_FOUND',
  message: 'Leave request not found'
}

// 409 - Conflict
{
  success: false,
  error: 'ALREADY_EXISTS',
  message: 'Employee is already on leave for today'
}
```

### Error Handling Example

```javascript
async function applyLeave(leaveData) {
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
      switch (data.error) {
        case 'VALIDATION_ERROR':
          // Show validation error message
          alert(data.message);
          break;
        case 'INSUFFICIENT_ROLE':
          // Redirect to unauthorized page
          router.push('/unauthorized');
          break;
        case 'ALREADY_EXISTS':
          // Show info message
          alert('Leave already exists for this period');
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

---

## 12. React Integration Examples

### 12.1 Custom Hook for Leave Management

```typescript
// hooks/useLeaveManagement.ts
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface LeaveRequest {
  request_id: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  days: number;
  status: string;
  reason: string;
}

export function useLeaveManagement() {
  const { token, tenantId } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

  // Get leave requests
  const getLeaves = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/hr/leave-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLeaves(data.data.requests || []);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  // Apply for leave
  const applyLeave = async (leaveData: {
    leave_type: string;
    from_date: string;
    to_date: string;
    reason: string;
    half_day?: boolean;
  }) => {
    setLoading(true);
    setError(null);
    try {
      // Note: employee_id is NOT needed - auto-set from token
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
      
      if (data.success) {
        await getLeaves(); // Refresh list
        return data.data;
      } else {
        setError(data.message);
        return null;
      }
    } catch (err) {
      setError('Failed to apply for leave');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Mark leave for today (quick leave)
  const markLeaveToday = async (leave_type: string, reason: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/hr/leave/mark-today`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ leave_type, reason })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await getLeaves(); // Refresh list
        return data.data;
      } else if (data.error === 'ALREADY_EXISTS') {
        setError('Leave already exists for today');
        return null;
      } else {
        setError(data.message);
        return null;
      }
    } catch (err) {
      setError('Failed to mark leave');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Approve leave (Manager/HR/Admin)
  const approveLeave = async (requestId: string, comments?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/hr/leave-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comments })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await getLeaves(); // Refresh list
        return data.data;
      } else {
        setError(data.message);
        return null;
      }
    } catch (err) {
      setError('Failed to approve leave');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Reject leave (Manager/HR/Admin)
  const rejectLeave = async (requestId: string, reason: string, comments?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/hr/leave-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason, comments })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await getLeaves(); // Refresh list
        return data.data;
      } else {
        setError(data.message);
        return null;
      }
    } catch (err) {
      setError('Failed to reject leave');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && tenantId) {
      getLeaves();
    }
  }, [token, tenantId]);

  return {
    leaves,
    loading,
    error,
    getLeaves,
    applyLeave,
    markLeaveToday,
    approveLeave,
    rejectLeave
  };
}
```

### 12.2 Leave Application Component

```typescript
// components/LeaveApplicationForm.tsx
import { useState } from 'react';
import { useLeaveManagement } from '../hooks/useLeaveManagement';

export function LeaveApplicationForm() {
  const { applyLeave, markLeaveToday, loading, error } = useLeaveManagement();
  const [formData, setFormData] = useState({
    leave_type: 'CL',
    from_date: '',
    to_date: '',
    reason: '',
    half_day: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Note: employee_id is NOT needed - auto-set from token
    const result = await applyLeave(formData);
    
    if (result) {
      alert('Leave applied successfully!');
      // Reset form
      setFormData({
        leave_type: 'CL',
        from_date: '',
        to_date: '',
        reason: '',
        half_day: false
      });
    }
  };

  const handleQuickLeave = async () => {
    const reason = prompt('Enter reason for leave:');
    if (reason) {
      const result = await markLeaveToday('CL', reason);
      if (result) {
        alert('Leave marked for today!');
      }
    }
  };

  return (
    <div>
      <h2>Apply for Leave</h2>
      
      {error && <div className="error">{error}</div>}
      
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
          {loading ? 'Applying...' : 'Apply for Leave'}
        </button>
      </form>
      
      <button onClick={handleQuickLeave} disabled={loading}>
        Mark Leave for Today
      </button>
    </div>
  );
}
```

---

## 13. Testing Checklist

### ✅ Employee Flow
- [ ] Employee can login and get token
- [ ] Employee can view their leave balance
- [ ] Employee can apply for leave (without passing employee_id)
- [ ] Employee can mark leave for today
- [ ] Employee can view their leave requests
- [ ] Employee can cancel pending leave requests
- [ ] Employee cannot see other employees' leaves

### ✅ Manager Flow
- [ ] Manager can login and get token
- [ ] Manager can apply for leave (without passing employee_id)
- [ ] Manager can view their team's pending leave requests
- [ ] Manager can approve leave requests
- [ ] Manager can reject leave requests with reason
- [ ] Manager cannot see other teams' leaves

### ✅ HR/Admin Flow
- [ ] HR/Admin can login and get token
- [ ] HR/Admin can create leave for any employee
- [ ] HR/Admin can view all leave requests
- [ ] HR/Admin can approve/reject leave requests
- [ ] HR/Admin can bulk approve/reject
- [ ] HR/Admin can manage holidays and blackout periods

### ✅ Tenant Isolation
- [ ] Upcapto employees cannot see Eyekra employees' leaves
- [ ] Eyekra employees cannot see Upcapto employees' leaves
- [ ] Cross-tenant data access is prevented

---

## 14. Production URLs

### API Base URLs
- **Production (ALB):** `http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com`
- **Production (DNS):** `https://api.etelios.com` (if configured)

### Environment Variables
```bash
NEXT_PUBLIC_API_BASE_URL=http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com
```

---

## 📝 Important Notes

### 1. Employee ID Auto-Set
- ✅ **DO NOT** pass `employee_id` in request body for employees/managers
- ✅ Backend automatically sets `employee_id` from the logged-in user's token
- ✅ Only HR/Admin should pass `employee_id` when creating leave for another employee

### 2. Tenant Isolation
- ✅ Always include `X-Tenant-Id` header
- ✅ Tenant ID is automatically extracted from login response
- ✅ Cross-tenant data access is prevented at backend level

### 3. Role-Based Access
- ✅ Employees can only see/modify their own leaves
- ✅ Managers can see/approve their team's leaves
- ✅ HR/Admin can see/modify all leaves in their tenant

### 4. Leave Policy
- ✅ Leave application works even if no leave policy is configured
- ✅ System uses default leave type configurations
- ✅ No need to configure policy before employees can apply

---

## 🎉 Summary

All leave management features are **production-ready** and **fully tested**:

- ✅ Employee leave application (with auto employee_id)
- ✅ Manager/HR approval/rejection
- ✅ Leave balance tracking
- ✅ Holiday & blackout period management
- ✅ Approval workflows
- ✅ Reports & analytics
- ✅ Notification settings
- ✅ Tenant isolation
- ✅ Role-based access control

**Status:** ✅ **READY FOR FRONTEND INTEGRATION**

---

**Last Updated:** March 7, 2026  
**Version:** 3.0  
**Deployment Status:** ✅ Deployed & Tested
