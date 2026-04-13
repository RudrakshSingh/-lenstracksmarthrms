# Leave Management API - Complete Summary

**Date:** March 2026  
**Purpose:** Complete reference for frontend and backend teams on leave management APIs

---

## 📊 Implementation Status Overview

- **Total Endpoints Required:** 34
- **✅ Implemented:** 21
- **❌ Missing:** 13
- **📦 Extra (Backend Only):** 7

---

## ✅ All Implemented Endpoints

### Core Leave Operations
| Method | Path | Description | Status |
|--------|------|-------------|--------|
| GET | `/api/hr/policies/leave` | Get leave policy | ✅ |
| POST | `/api/hr/leave-requests` | Create leave request | ✅ |
| GET | `/api/hr/leave-requests` | Get leave requests (with filters) | ✅ |
| GET | `/api/hr/leave-requests/:id` | Get leave request by ID | ✅ |
| POST | `/api/hr/leave-requests/:id/approve` | Approve leave request | ✅ |
| POST | `/api/hr/leave-requests/:id/reject` | Reject leave request | ✅ |
| POST | `/api/hr/leave-requests/:id/cancel` | Cancel leave request | ✅ |
| GET | `/api/hr/leave-ledger` | Get leave ledger | ✅ |
| POST | `/api/hr/leave/mark-today` | Mark leave for today | ✅ |

### Leave Balance
| Method | Path | Description | Status |
|--------|------|-------------|--------|
| GET | `/api/hr/leaves/balance` | Get leave balance | ✅ |
| GET | `/api/hr/leaves/applications` | Get leave applications | ✅ NEW |

### Alias Routes (Frontend Compatibility)
| Method | Path | Description | Status |
|--------|------|-------------|--------|
| GET | `/api/hr/leave` | Alias for getLeaveRequests | ✅ |
| GET | `/api/hr/leaves` | Alias for getLeaveRequests | ✅ |
| POST | `/api/hr/leave` | Alias for createLeaveRequest | ✅ |
| POST | `/api/hr/leaves` | Alias for createLeaveRequest | ✅ |
| POST | `/api/hr/leaves/:id/approve` | Alias for approve | ✅ NEW |
| POST | `/api/hr/leaves/:id/reject` | Alias for reject | ✅ NEW |

### Newly Implemented (March 2026)
| Method | Path | Description | Status |
|--------|------|-------------|--------|
| POST | `/api/hr/leaves/bulk-action` | Bulk approve/reject | ✅ NEW |
| GET | `/api/hr/leave/balances?expiringWithin=30` | Expiring leave balances | ✅ NEW |
| GET | `/api/attendance/leave/balances?expiringWithin=30` | Expiring balances (attendance proxy) | ✅ NEW |
| GET | `/api/leaves?employeeId=&months=` | Leaves for roster | ✅ NEW |

---

## ❌ Missing Endpoints (To Be Implemented)

### Leave Type Management
| Method | Path | Description | Priority |
|--------|------|-------------|----------|
| POST | `/api/hr/policies/leave/types` | Create leave type | High |
| PUT | `/api/hr/policies/leave/types/:id` | Update leave type | High |

### Holidays Management
| Method | Path | Description | Priority |
|--------|------|-------------|----------|
| GET | `/api/hr/holidays?year=2026` | Get holidays | Medium |
| POST | `/api/hr/holidays` | Create holiday | Medium |
| PUT | `/api/hr/holidays/:id` | Update holiday | Medium |

### Blackout Periods
| Method | Path | Description | Priority |
|--------|------|-------------|----------|
| GET | `/api/hr/leave/blackout` | Get blackout periods | Medium |
| POST | `/api/hr/leave/blackout` | Create blackout period | Medium |
| PUT | `/api/hr/leave/blackout/:id` | Update blackout period | Medium |

### Approval Workflow
| Method | Path | Description | Priority |
|--------|------|-------------|----------|
| GET | `/api/hr/leave/workflow` | Get workflow config | Medium |
| PUT | `/api/hr/leave/workflow` | Save workflow config | Medium |

### Reports & Analytics
| Method | Path | Description | Priority |
|--------|------|-------------|----------|
| GET | `/api/hr/leave/reports?reportType=&period=&department=` | Generate report | Low |

### Notification Settings
| Method | Path | Description | Priority |
|--------|------|-------------|----------|
| GET | `/api/hr/leave/notification-settings` | Get notification settings | Low |
| PUT | `/api/hr/leave/notification-settings` | Save notification settings | Low |

---

## 📦 Extra Backend Endpoints (Not in Frontend Spec)

These endpoints are available in the backend but not documented in the frontend spec. Frontend can use these to enhance features:

### 1. Mark Leave for Today
- **Path:** `POST /api/hr/leave/mark-today`
- **Use Case:** Quick leave marking without full application
- **Access:** HR/Admin (auto-approved), Employee (pending)

### 2. Update Leave Balance
- **Path:** `PUT /api/hr/leaves/balance`
- **Use Case:** Manual balance corrections
- **Access:** HR, Admin, SuperAdmin only

### 3. Deduct Leave
- **Path:** `POST /api/hr/leaves/deduct`
- **Use Case:** Manual leave deduction
- **Access:** HR, Admin, SuperAdmin, Manager

### 4. Add Compensatory Off
- **Path:** `POST /api/hr/leaves/comp-off`
- **Use Case:** Add comp-off for holiday work
- **Access:** HR, Admin, SuperAdmin, Manager

### 5. Reset Leave Balance
- **Path:** `POST /api/hr/leaves/reset`
- **Use Case:** Year-end balance reset
- **Access:** HR, Admin, SuperAdmin only

### 6. Get All Leave Balances
- **Path:** `GET /api/hr/leaves/all`
- **Use Case:** HR dashboard showing all balances
- **Access:** HR, Admin, SuperAdmin, Manager

### 7. Approve with Level (Advanced)
- **Path:** `PATCH /api/hr/leave-requests/:id`
- **Use Case:** Multi-level approval workflows
- **Access:** HR, Admin, Manager (with level permissions)

**Full documentation:** See `BACKEND_LEAVE_ENDPOINTS_FOR_FRONTEND.md`

---

## 🔄 Frontend-Backend Alignment

### ✅ Aligned Endpoints
All endpoints in the frontend spec that are implemented match the expected:
- Request format (headers, body, query params)
- Response format (`{ success, data, message }`)
- Error handling
- Tenant isolation

### ⚠️ Known Gaps
1. **Apply Leave FormData:** Frontend sends FormData to `POST /api/attendance/leave`, but backend expects JSON. **Action:** Backend should accept FormData OR frontend should send JSON.
2. **Date Field Names:** Frontend uses `startDate`/`endDate`, backend uses `from_date`/`to_date`. **Action:** Backend should accept both or document one standard.
3. **Missing Endpoints:** 13 endpoints from frontend spec are not yet implemented (see Missing Endpoints section above).

---

## 📝 Request/Response Standards

### Headers (All Requests)
```
Authorization: Bearer <access_token>
X-Tenant-Id: <tenantId>
Content-Type: application/json
```

### Success Response
```json
{
  "success": true,
  "data": <response_data>,
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": "ERROR_CODE"
}
```

### Pagination (Where Applicable)
```json
{
  "success": true,
  "data": <array>,
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 100,
    "totalPages": 4
  }
}
```

---

## 🎯 Priority Implementation Order

### Phase 1 (High Priority - Core Features)
1. Leave Type Management (POST/PUT `/api/hr/policies/leave/types`)
2. Holidays Management (GET/POST/PUT `/api/hr/holidays`)

### Phase 2 (Medium Priority - Workflow)
3. Blackout Periods (GET/POST/PUT `/api/hr/leave/blackout`)
4. Approval Workflow (GET/PUT `/api/hr/leave/workflow`)

### Phase 3 (Low Priority - Analytics)
5. Reports & Analytics (GET `/api/hr/leave/reports`)
6. Notification Settings (GET/PUT `/api/hr/leave/notification-settings`)

---

## 📚 Related Documents

1. **Frontend API Spec:** `LEAVE_MANAGEMENT_FRONTEND_API_SPEC.md` (provided by user)
2. **Backend Extra Endpoints:** `BACKEND_LEAVE_ENDPOINTS_FOR_FRONTEND.md`
3. **Implementation Status:** `LEAVE_API_IMPLEMENTATION_STATUS.md`

---

## ✅ Completed Actions (March 2026)

1. ✅ Compared frontend spec with backend endpoints
2. ✅ Identified all gaps (13 missing endpoints)
3. ✅ Implemented critical missing endpoints:
   - Leave applications list
   - Bulk approve/reject
   - Expiring leave balances
   - Roster leaves
   - Alias routes for frontend compatibility
4. ✅ Created documentation for extra backend endpoints
5. ✅ Created implementation status tracking document

---

**Next Steps:** Implement remaining 13 endpoints as per priority order above.
