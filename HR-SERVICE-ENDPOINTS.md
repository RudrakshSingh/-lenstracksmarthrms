# HR Service - Complete Endpoints Documentation

## Overview

The HR Service contains **81+ endpoints** across **14 route modules**, providing comprehensive HR management functionality.

## Endpoint Count by Module

| Module | Endpoints | Base Path |
|--------|-----------|-----------|
| **Auth Routes** | 4 | `/api/hr/auth` |
| **HR Routes** | 10 | `/api/hr` |
| **Onboarding Routes** | 5 | `/api/hr/onboarding` |
| **Leave Routes** | 8 | `/api/hr/leave` |
| **Payroll Routes** | 8 | `/api/hr/payroll` |
| **Transfer Routes** | 5 | `/api/hr/transfer` |
| **HR Letter Routes** | 10 | `/api/hr/letters` |
| **Incentive Routes** | 5 | `/api/hr/incentive` |
| **F&F Routes** | 5 | `/api/hr/fnf` |
| **Statutory Routes** | 6 | `/api/hr/statutory` |
| **Reports Routes** | 8 | `/api/hr/reports` |
| **Audit Routes** | 2 | `/api/hr/audit` |
| **Webhooks Routes** | 3 | `/api/hr/webhooks` |
| **Leave Year Close** | 1 | `/api/hr/leave-year-close` |
| **TOTAL** | **80+** | |

---

## Detailed Endpoint List

### 1. Authentication Routes (`/api/hr/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/hr/auth/login` | User login | No |
| POST | `/api/hr/auth/refresh` | Refresh access token | No |
| POST | `/api/hr/auth/logout` | User logout | Yes |
| GET | `/api/hr/auth/me` | Get current user info | Yes |

**Total: 4 endpoints**

---

### 2. HR Management Routes (`/api/hr`)

#### Employee Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/hr/employees` | Get all employees (paginated) | Yes (HR/Admin) |
| POST | `/api/hr/employees` | Create new employee | Yes (HR/Admin) |
| PUT | `/api/hr/employees/:id` | Update employee | Yes (HR/Admin) |
| DELETE | `/api/hr/employees/:id` | Delete employee | Yes (HR/Admin) |
| POST | `/api/hr/employees/:id/assign-role` | Assign role to employee | Yes (HR/Admin) |
| PATCH | `/api/hr/employees/:id/status` | Update employee status | Yes (HR/Admin) |

#### Store Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/hr/stores` | Get all stores | Yes (HR/Admin) |
| POST | `/api/hr/stores` | Create new store | Yes (HR/Admin) |
| GET | `/api/hr/stores/:id` | Get store by ID | Yes (HR/Admin) |
| PUT | `/api/hr/stores/:id` | Update store | Yes (HR/Admin) |
| DELETE | `/api/hr/stores/:id` | Delete store | Yes (HR/Admin) |

**Total: 10 endpoints**

---

### 3. Onboarding Routes (`/api/hr/onboarding`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/hr/onboarding/personal-details` | Step 1: Add personal details | Yes |
| POST | `/api/hr/onboarding/work-details` | Step 2: Add work details | Yes |
| POST | `/api/hr/onboarding/statutory-info` | Step 3: Add statutory info | Yes |
| POST | `/api/hr/onboarding/documents` | Step 4: Upload documents | Yes |
| GET | `/api/hr/onboarding/draft/:employeeId` | Get onboarding draft | Yes |

**Total: 5 endpoints**

---

### 4. Leave Management Routes (`/api/hr/leave`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/hr/leave/requests` | Get all leave requests | Yes |
| POST | `/api/hr/leave/requests` | Create leave request | Yes |
| GET | `/api/hr/leave/requests/:id` | Get leave request by ID | Yes |
| GET | `/api/hr/leave/balance` | Get leave balance | Yes |
| PATCH | `/api/hr/leave/requests/:id` | Update leave request | Yes |
| GET | `/api/hr/leave/policies` | Get leave policies | Yes |
| POST | `/api/hr/leave/requests/:id/approve` | Approve leave request | Yes (Manager/HR) |
| POST | `/api/hr/leave/requests/:id/reject` | Reject leave request | Yes (Manager/HR) |

**Total: 8 endpoints**

---

### 5. Payroll Routes (`/api/hr/payroll`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/hr/payroll/runs` | Create payroll run | Yes (HR/Admin) |
| POST | `/api/hr/payroll/runs/:id/process` | Process payroll run | Yes (HR/Admin) |
| POST | `/api/hr/payroll/runs/:id/lock` | Lock payroll run | Yes (HR/Admin) |
| POST | `/api/hr/payroll/runs/:id/post` | Post payroll run | Yes (HR/Admin) |
| GET | `/api/hr/payroll/runs` | Get all payroll runs | Yes (HR/Admin) |
| GET | `/api/hr/payroll/runs/:id` | Get payroll run by ID | Yes (HR/Admin) |
| POST | `/api/hr/payroll/override` | Create payroll override | Yes (HR/Admin) |
| GET | `/api/hr/payroll/payslips` | Get payslips | Yes |

**Total: 8 endpoints**

---

### 6. Transfer Routes (`/api/hr/transfer`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/hr/transfer` | Create transfer request | Yes |
| GET | `/api/hr/transfer` | Get all transfers | Yes |
| POST | `/api/hr/transfer/:id/approve` | Approve transfer | Yes (HR/Admin) |
| POST | `/api/hr/transfer/:id/reject` | Reject transfer | Yes (HR/Admin) |
| POST | `/api/hr/transfer/:id/cancel` | Cancel transfer | Yes |

**Total: 5 endpoints**

---

### 7. HR Letter Routes (`/api/hr/letters`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/hr/letters` | Create HR letter | Yes (HR/Admin) |
| GET | `/api/hr/letters` | Get all HR letters | Yes (HR/Admin) |
| GET | `/api/hr/letters/:letterId` | Get HR letter by ID | Yes (HR/Admin) |
| PUT | `/api/hr/letters/:letterId` | Update HR letter | Yes (HR/Admin) |
| POST | `/api/hr/letters/:letterId/submit` | Submit HR letter | Yes (HR/Admin) |
| POST | `/api/hr/letters/:letterId/approve` | Approve HR letter | Yes (HR/Admin) |
| POST | `/api/hr/letters/:letterId/reject` | Reject HR letter | Yes (HR/Admin) |
| GET | `/api/hr/letters/:letterId/preview` | Preview HR letter | Yes (HR/Admin) |
| POST | `/api/hr/helpers/compute-comp` | Compute compensation | Yes (HR/Admin) |
| GET | `/api/hr/stats` | Get HR statistics | Yes (HR/Admin) |

**Total: 10 endpoints**

---

### 8. Incentive Routes (`/api/hr/incentive`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/hr/incentive/claims` | Create incentive claim | Yes |
| GET | `/api/hr/incentive/claims` | Get incentive claims | Yes |
| POST | `/api/hr/incentive/claims/:id/approve` | Approve incentive claim | Yes (HR/Admin) |
| POST | `/api/hr/incentive/claims/:id/reject` | Reject incentive claim | Yes (HR/Admin) |
| POST | `/api/hr/incentive/clawback` | Apply clawback | Yes (HR/Admin) |

**Total: 5 endpoints**

---

### 9. F&F (Full & Final) Routes (`/api/hr/fnf`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/hr/fnf/cases` | Initiate F&F case | Yes (HR/Admin) |
| GET | `/api/hr/fnf/cases` | Get all F&F cases | Yes (HR/Admin) |
| GET | `/api/hr/fnf/cases/:id` | Get F&F case by ID | Yes (HR/Admin) |
| POST | `/api/hr/fnf/cases/:id/approve` | Approve F&F case | Yes (HR/Admin) |
| POST | `/api/hr/fnf/cases/:id/payout` | Process F&F payout | Yes (HR/Admin) |

**Total: 5 endpoints**

---

### 10. Statutory Routes (`/api/hr/statutory`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/hr/statutory/pf` | Export PF data | Yes (HR/Admin) |
| POST | `/api/hr/statutory/esi` | Export ESI data | Yes (HR/Admin) |
| POST | `/api/hr/statutory/tds` | Export TDS data | Yes (HR/Admin) |
| POST | `/api/hr/statutory/lwf` | Export LWF data | Yes (HR/Admin) |
| GET | `/api/hr/statutory/exports` | Get all statutory exports | Yes (HR/Admin) |
| POST | `/api/hr/statutory/validate` | Validate statutory data | Yes (HR/Admin) |

**Total: 6 endpoints**

---

### 11. Reports Routes (`/api/hr/reports`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/hr/reports/employee` | Employee report | Yes (HR/Admin) |
| GET | `/api/hr/reports/attendance` | Attendance report | Yes (HR/Admin) |
| GET | `/api/hr/reports/leave` | Leave report | Yes (HR/Admin) |
| GET | `/api/hr/reports/payroll` | Payroll report | Yes (HR/Admin) |
| GET | `/api/hr/reports/statutory` | Statutory report | Yes (HR/Admin) |
| GET | `/api/hr/reports/transfer` | Transfer report | Yes (HR/Admin) |
| GET | `/api/hr/reports/incentive` | Incentive report | Yes (HR/Admin) |
| GET | `/api/hr/reports/fnf` | F&F report | Yes (HR/Admin) |

**Total: 8 endpoints**

---

### 12. Audit Routes (`/api/hr/audit`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/hr/audit/logs` | Get audit logs | Yes (HR/Admin) |
| GET | `/api/hr/audit/verify` | Verify audit logs | Yes (HR/Admin) |

**Total: 2 endpoints**

---

### 13. Webhooks Routes (`/api/hr/webhooks`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/hr/webhooks/payroll` | Payroll webhook | No (Webhook) |
| POST | `/api/hr/webhooks/attendance` | Attendance webhook | No (Webhook) |
| POST | `/api/hr/webhooks/leave` | Leave webhook | No (Webhook) |

**Total: 3 endpoints**

---

### 14. Leave Year Close Routes (`/api/hr/leave-year-close`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/hr/leave-year-close` | Close leave year | Yes (HR/Admin) |

**Total: 1 endpoint**

---

## Summary

### Total Endpoints: **80+ endpoints**

### Breakdown by HTTP Method:
- **GET**: ~35 endpoints
- **POST**: ~35 endpoints
- **PUT**: ~5 endpoints
- **PATCH**: ~5 endpoints
- **DELETE**: ~2 endpoints

### Access Through API Gateway:

All endpoints are accessible through the main API Gateway:

```
https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/hr/{endpoint}
```

### Example:
- **Direct HR Service**: `https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net/api/hr/employees`
- **Through Gateway**: `https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/hr/employees`

Both routes work the same way - the gateway proxies requests to the HR service.

---

## Authentication

Most endpoints require:
- **JWT Token** in `Authorization: Bearer <token>` header
- **Role-based access** (HR, Admin, SuperAdmin, Manager, Employee)
- **Permission-based access** for specific operations

---

## Frontend Integration

See `FRONTEND-API-ACCESS.md` for complete frontend integration guide with code examples.

