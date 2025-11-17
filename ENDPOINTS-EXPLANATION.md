# Endpoints Explanation: Backend vs Frontend

## Quick Answer

**The endpoints are used by the FRONTEND, not the backend.**

- **Backend (API Gateway)**: Exposes/provides the endpoints (this is what we're building)
- **Frontend**: Uses/calls these endpoints (makes HTTP requests to get data, submit forms, etc.)

## How It Works

```
Frontend (React/Next.js) 
    ↓ (makes HTTP request)
API Gateway (Backend - what we're building)
    ↓ (proxies request)
Microservice (Auth/HR Service)
    ↓ (processes request)
Database
    ↓ (returns data)
Microservice
    ↓ (returns response)
API Gateway
    ↓ (returns response)
Frontend (displays data)
```

## Example Flow

### Frontend Code (React):
```javascript
// Frontend makes a request to the backend API
const response = await fetch('https://your-gateway-url/api/hr/employees', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const employees = await response.json();
```

### Backend (API Gateway):
- Receives request at `/api/hr/employees`
- Proxies to HR service
- Returns response to frontend

### HR Service:
- Receives request
- Queries database
- Returns employee data

## All Available Endpoints

### Auth Service Endpoints

**Base Path:** `/api/auth`

1. **POST** `/api/auth/register` - Register new user
2. **POST** `/api/auth/login` - Login user
3. **POST** `/api/auth/refresh-token` - Refresh access token
4. **POST** `/api/auth/logout` - Logout user
5. **POST** `/api/auth/change-password` - Change password
6. **POST** `/api/auth/request-password-reset` - Request password reset
7. **POST** `/api/auth/reset-password` - Reset password with token
8. **GET** `/api/auth/profile` - Get user profile
9. **PUT** `/api/auth/profile` - Update user profile
10. **GET** `/api/auth/status` - Service status
11. **GET** `/api/auth/health` - Health check

**Additional Auth Routes:**
- `/api/real-users/*` - Real users management
- `/api/permission/*` - Permission management
- `/api/auth/emergency/*` - Emergency lock system

### HR Service Endpoints

**Base Path:** `/api/hr`

#### Employee Management
1. **GET** `/api/hr/employees` - Get all employees
2. **POST** `/api/hr/employees` - Create employee
3. **PUT** `/api/hr/employees/:id` - Update employee
4. **DELETE** `/api/hr/employees/:id` - Delete employee
5. **POST** `/api/hr/employees/:id/assign-role` - Assign role
6. **PATCH** `/api/hr/employees/:id/status` - Update status

#### Store Management
7. **GET** `/api/hr/stores` - Get all stores
8. **POST** `/api/hr/stores` - Create store
9. **GET** `/api/hr/stores/:id` - Get store by ID
10. **PUT** `/api/hr/stores/:id` - Update store
11. **DELETE** `/api/hr/stores/:id` - Delete store

#### Onboarding
12. **POST** `/api/hr/work-details` - Add work details (Step 2)
13. **PATCH** `/api/hr/employees/:employeeId/statutory` - Add statutory info (Step 3)
14. **POST** `/api/hr/employees/:employeeId/complete-onboarding` - Complete onboarding
15. **POST** `/api/hr/onboarding/draft` - Save draft
16. **GET** `/api/hr/onboarding/draft` - Get draft

#### Leave Management
17. **GET** `/api/hr/policies/leave` - Get leave policies
18. **POST** `/api/hr/leave-requests` - Create leave request
19. **GET** `/api/hr/leave-requests` - Get leave requests
20. **GET** `/api/hr/leave-requests/:id` - Get leave request by ID
21. **PATCH** `/api/hr/leave-requests/:id` - Update/approve leave request
22. **GET** `/api/hr/leave-ledger` - Get leave ledger
23. **POST** `/api/hr/leave-requests/:id/reject` - Reject leave request
24. **POST** `/api/hr/leave-requests/:id/cancel` - Cancel leave request
25. **POST** `/api/hr/leave-year-close` - Close leave year

#### Payroll Management
26. **POST** `/api/hr/payroll-runs` - Create payroll run
27. **POST** `/api/hr/payroll-runs/:id/process` - Process payroll run
28. **POST** `/api/hr/payroll-runs/:id/lock` - Lock payroll run
29. **POST** `/api/hr/payroll-runs/:id/post` - Post payroll run
30. **GET** `/api/hr/payroll-runs` - Get all payroll runs
31. **GET** `/api/hr/payroll-runs/:id` - Get payroll run by ID
32. **POST** `/api/hr/payroll-runs/:id/override` - Create payroll override
33. **GET** `/api/hr/payslips` - Get payslips

#### Transfer Management
34. **POST** `/api/transfers` - Create transfer request
35. **GET** `/api/transfers` - Get all transfers
36. **POST** `/api/transfers/:id/approve` - Approve transfer
37. **POST** `/api/transfers/:id/reject` - Reject transfer
38. **POST** `/api/transfers/:id/cancel` - Cancel transfer

#### HR Letters
39. **POST** `/api/hr-letter/letters` - Create HR letter
40. **GET** `/api/hr-letter/letters` - Get all HR letters
41. **GET** `/api/hr-letter/letters/:letterId` - Get HR letter by ID
42. **PUT** `/api/hr-letter/letters/:letterId` - Update HR letter
43. **POST** `/api/hr-letter/letters/:letterId/submit` - Submit for approval
44. **POST** `/api/hr-letter/letters/:letterId/approve` - Approve letter
45. **POST** `/api/hr-letter/letters/:letterId/reject` - Reject letter
46. **GET** `/api/hr-letter/letters/:letterId/preview` - Preview letter
47. **POST** `/api/hr-letter/helpers/compute-comp` - Compute compensation
48. **GET** `/api/hr-letter/stats` - Get HR letter stats

#### Incentive Management
49. **POST** `/api/hr/incentive-claims` - Create incentive claim
50. **GET** `/api/hr/incentive-claims` - Get incentive claims
51. **POST** `/api/hr/incentive-claims/:id/approve` - Approve incentive claim
52. **POST** `/api/hr/clawback/apply` - Apply clawback
53. **POST** `/api/hr/webhooks/returns-remakes` - Process returns/remakes

#### F&F (Full & Final)
54. **POST** `/api/hr/fnf` - Initiate F&F case
55. **GET** `/api/hr/fnf` - Get all F&F cases
56. **GET** `/api/hr/fnf/:id` - Get F&F case by ID
57. **POST** `/api/hr/fnf/:id/approve` - Approve F&F case
58. **POST** `/api/hr/fnf/:id/payout` - Process F&F payout

#### Statutory Management
59. **POST** `/api/hr/stat-exports/epf` - Export EPF data
60. **POST** `/api/hr/stat-exports/esic` - Export ESIC data
61. **POST** `/api/hr/stat-exports/form24q` - Export Form 24Q
62. **POST** `/api/hr/stat-exports/form16` - Export Form 16
63. **GET** `/api/hr/stat-exports` - Get all statutory exports
64. **POST** `/api/hr/stat-exports/:id/validate` - Validate export

#### Reports
65. **GET** `/api/hr/reports/payroll-cost` - Payroll cost report
66. **GET** `/api/hr/reports/incentive-sales` - Incentive as % of sales
67. **GET** `/api/hr/reports/clawback` - Clawback report
68. **GET** `/api/hr/reports/lwp-days` - LWP days report
69. **GET** `/api/hr/reports/leave-utilization` - Leave utilization report
70. **GET** `/api/hr/reports/attrition` - Attrition report
71. **GET** `/api/hr/reports/fnf-stats` - F&F stats report
72. **GET** `/api/hr/reports/statutory-filing` - Statutory filing report

#### Audit
73. **GET** `/api/hr/audit-logs` - Get audit logs
74. **GET** `/api/hr/audit/verify-consistency` - Verify audit consistency

#### Webhooks
75. **POST** `/api/hr/webhooks/sales/closed` - Sales closed webhook
76. **POST** `/api/hr/webhooks/returns-remakes` - Returns/remakes webhook
77. **POST** `/api/hr/webhooks/stat/filing-status` - Statutory filing status webhook

## Total Endpoints

- **Auth Service:** ~20+ endpoints
- **HR Service:** ~80+ endpoints
- **Total:** ~100+ endpoints

## Frontend Usage Example

```javascript
// In your React component
import axios from 'axios';

const API_BASE_URL = 'https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net';

// Login
const login = async (email, password) => {
  const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
    emailOrEmployeeId: email,
    password: password
  });
  return response.data;
};

// Get employees
const getEmployees = async (token) => {
  const response = await axios.get(`${API_BASE_URL}/api/hr/employees`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data;
};

// Create leave request
const createLeaveRequest = async (token, leaveData) => {
  const response = await axios.post(`${API_BASE_URL}/api/hr/leave-requests`, leaveData, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data;
};
```

## Summary

- **Backend (API Gateway)**: Provides/exposes endpoints ✅ (what we're building)
- **Frontend**: Uses/calls endpoints ✅ (makes HTTP requests)
- **All endpoints are accessible through the Gateway**
- **Frontend will call these endpoints to get data and perform actions**

