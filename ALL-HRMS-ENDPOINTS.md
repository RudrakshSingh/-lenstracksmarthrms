# Complete HRMS Endpoints List

This document lists **ALL endpoints** across the entire HRMS system.

## 📊 Summary

- **HR Service**: 80+ endpoints
- **Auth Service**: ~15 endpoints
- **Total**: **95+ endpoints**

---

## 🔐 Auth Service Endpoints

**Base URL**: `/api/auth` or `https://etelios-auth-service.azurewebsites.net/api/auth`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | User login | No |
| POST | `/api/auth/refresh` | Refresh access token | No |
| POST | `/api/auth/logout` | User logout | Yes |
| GET | `/api/auth/me` | Get current user info | Yes |
| POST | `/api/auth/change-password` | Change password | Yes |
| POST | `/api/auth/forgot-password` | Request password reset | No |
| POST | `/api/auth/reset-password` | Reset password with token | No |
| GET | `/api/auth/verify-email/:token` | Verify email address | No |
| POST | `/api/auth/resend-verification` | Resend verification email | No |
| GET | `/api/auth/status` | Service status | No |
| GET | `/api/auth/health` | Health check | No |
| GET | `/health` | Health check | No |
| GET | `/` | Service info | No |

**Total: ~15 endpoints**

---

## 👥 HR Service Endpoints

**Base URL**: `/api/hr` or `https://etelios-hr-service.azurewebsites.net/api/hr`

### 1. Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login` | User login | No |
| POST | `/api/auth/refresh` | Refresh access token | No |
| POST | `/api/auth/logout` | User logout | Yes |
| GET | `/api/auth/me` | Get current user info | Yes |

**Total: 4 endpoints**

---

### 2. HR Management Routes (`/api/hr`)

#### Employee Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/hr/employees` | Get all employees (paginated) | Yes (HR/Admin) |
| POST | `/api/hr/employees` | Create new employee | Yes (HR/Admin) |
| GET | `/api/hr/employees/:id` | Get employee by ID | Yes |
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

**Total: 12 endpoints**

---

### 3. Onboarding Routes (`/api/hr/onboarding`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/hr/onboarding/personal-details` | Step 1: Add personal details | Yes |
| POST | `/api/hr/onboarding/work-details` | Step 2: Add work details | Yes |
| POST | `/api/hr/onboarding/statutory-info` | Step 3: Add statutory info | Yes |
| POST | `/api/hr/onboarding/documents` | Step 4: Upload documents | Yes |
| GET | `/api/hr/onboarding/draft/:employeeId` | Get onboarding draft | Yes |
| PATCH | `/api/hr/onboarding/draft/:employeeId` | Update onboarding draft | Yes |
| POST | `/api/hr/onboarding/complete/:employeeId` | Complete onboarding | Yes |

**Total: 7 endpoints**

---

### 4. Leave Management Routes (`/api/hr/leave`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/hr/leave/requests` | Get all leave requests | Yes |
| POST | `/api/hr/leave/requests` | Create leave request | Yes |
| GET | `/api/hr/leave/requests/:id` | Get leave request by ID | Yes |
| GET | `/api/hr/leave/balance` | Get leave balance | Yes |
| GET | `/api/hr/leave/balance/:employeeId` | Get leave balance for employee | Yes (HR/Admin) |
| PATCH | `/api/hr/leave/requests/:id` | Update leave request | Yes |
| GET | `/api/hr/leave/policies` | Get leave policies | Yes |
| POST | `/api/hr/leave/requests/:id/approve` | Approve leave request | Yes (Manager/HR) |
| POST | `/api/hr/leave/requests/:id/reject` | Reject leave request | Yes (Manager/HR) |

**Total: 9 endpoints**

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
| GET | `/api/hr/payroll/payslips/:id` | Get payslip by ID | Yes |

**Total: 9 endpoints**

---

### 6. Transfer Routes (`/api/transfers`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/transfers` | Create transfer request | Yes |
| GET | `/api/transfers` | Get all transfers | Yes |
| GET | `/api/transfers/:id` | Get transfer by ID | Yes |
| POST | `/api/transfers/:id/approve` | Approve transfer | Yes (HR/Admin) |
| POST | `/api/transfers/:id/reject` | Reject transfer | Yes (HR/Admin) |
| POST | `/api/transfers/:id/cancel` | Cancel transfer | Yes |

**Total: 6 endpoints**

---

### 7. HR Letter Routes (`/api/hr-letter`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/hr-letter/letters` | Create HR letter | Yes (HR/Admin) |
| GET | `/api/hr-letter/letters` | Get all HR letters | Yes (HR/Admin) |
| GET | `/api/hr-letter/letters/:letterId` | Get HR letter by ID | Yes (HR/Admin) |
| PUT | `/api/hr-letter/letters/:letterId` | Update HR letter | Yes (HR/Admin) |
| POST | `/api/hr-letter/letters/:letterId/submit` | Submit HR letter | Yes (HR/Admin) |
| POST | `/api/hr-letter/letters/:letterId/approve` | Approve HR letter | Yes (HR/Admin) |
| POST | `/api/hr-letter/letters/:letterId/reject` | Reject HR letter | Yes (HR/Admin) |
| GET | `/api/hr-letter/letters/:letterId/preview` | Preview HR letter | Yes (HR/Admin) |
| POST | `/api/hr-letter/helpers/compute-comp` | Compute compensation | Yes (HR/Admin) |
| GET | `/api/hr-letter/stats` | Get HR statistics | Yes (HR/Admin) |

**Total: 10 endpoints**

---

### 8. Incentive Routes (`/api/hr/incentive`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/hr/incentive/claims` | Create incentive claim | Yes |
| GET | `/api/hr/incentive/claims` | Get incentive claims | Yes |
| GET | `/api/hr/incentive/claims/:id` | Get incentive claim by ID | Yes |
| POST | `/api/hr/incentive/claims/:id/approve` | Approve incentive claim | Yes (HR/Admin) |
| POST | `/api/hr/incentive/claims/:id/reject` | Reject incentive claim | Yes (HR/Admin) |
| POST | `/api/hr/incentive/clawback` | Apply clawback | Yes (HR/Admin) |

**Total: 6 endpoints**

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

### 15. Health & Status Routes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/hr/health` | Health check | No |
| GET | `/api/hr/status` | Service status | No |
| GET | `/api/hr` | Service info & endpoints | No |
| GET | `/health` | Health check | No |

**Total: 4 endpoints**

---

## 📈 Complete Endpoint Summary

### By Service

| Service | Endpoints | Base Path |
|---------|-----------|-----------|
| **Auth Service** | ~15 | `/api/auth` |
| **HR Service** | 80+ | `/api/hr`, `/api/transfers`, `/api/hr-letter` |
| **TOTAL** | **95+** | |

### By HTTP Method

| Method | Count | Description |
|--------|-------|-------------|
| **GET** | ~40 | Retrieve data |
| **POST** | ~40 | Create/Submit data |
| **PUT** | ~8 | Update data |
| **PATCH** | ~7 | Partial update |
| **DELETE** | ~3 | Delete data |

### By Category

| Category | Endpoints |
|----------|-----------|
| **Authentication** | 19 |
| **Employee Management** | 12 |
| **Onboarding** | 7 |
| **Leave Management** | 9 |
| **Payroll** | 9 |
| **Transfers** | 6 |
| **HR Letters** | 10 |
| **Incentives** | 6 |
| **F&F (Full & Final)** | 5 |
| **Statutory** | 6 |
| **Reports** | 8 |
| **Audit** | 2 |
| **Webhooks** | 3 |
| **System** | 4 |

---

## 🌐 Access URLs

### Through API Gateway (Recommended)

```
https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/{service}/{endpoint}
```

**Examples:**
- `https://etelios-app-service.../api/auth/login`
- `https://etelios-app-service.../api/hr/employees`
- `https://etelios-app-service.../api/transfers`

### Direct Service Access

**Auth Service:**
```
https://etelios-auth-service.azurewebsites.net/api/auth/{endpoint}
```

**HR Service:**
```
https://etelios-hr-service.azurewebsites.net/api/hr/{endpoint}
```

---

## 🔑 Authentication

Most endpoints require:
- **JWT Token**: `Authorization: Bearer <token>`
- **Role-based access**: HR, Admin, SuperAdmin, Manager, Employee
- **Permission-based access**: Specific permissions for operations

**Public Endpoints** (No auth required):
- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/refresh`
- `/api/auth/forgot-password`
- `/api/auth/reset-password`
- `/api/auth/verify-email/:token`
- `/api/hr/health`
- `/api/hr/status`
- `/api/hr/webhooks/*` (Webhook endpoints)

---

## 📝 Notes

1. All endpoints support **JSON** request/response format
2. Pagination is available for list endpoints (query params: `page`, `limit`)
3. Filtering and sorting available on most GET endpoints
4. Rate limiting is applied to all endpoints
5. CORS is enabled for frontend access
6. All endpoints are logged for audit purposes

---

## 🔍 Quick Reference

**Most Used Endpoints:**
- `POST /api/auth/login` - User login
- `GET /api/hr/employees` - Get employees
- `POST /api/hr/onboarding/personal-details` - Start onboarding
- `GET /api/hr/leave/balance` - Check leave balance
- `POST /api/hr/leave/requests` - Apply for leave
- `GET /api/hr/payroll/payslips` - Get payslips

---

For detailed API documentation, see:
- `HR-SERVICE-ENDPOINTS.md` - Detailed HR service endpoints
- `FRONTEND-API-ACCESS.md` - Frontend integration guide
- `ENDPOINTS-EXPLANATION.md` - Endpoint usage explanation

