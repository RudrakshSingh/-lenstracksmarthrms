# Deployed Services & APIs on Azure AKS

**Cluster**: etelios-aks  
**Namespace**: etelios-backend-prod  
**Single IP**: 98.70.245.87  
**Access**: https://98.70.245.87/api/<service>/<endpoint>  
**Required Header**: `Host: api.etelios.com`  
**Date**: December 30, 2025

---

## 🌐 Currently Running Services (3 Services)

### ✅ 1. AUTH SERVICE
**Service Name**: `auth-service`  
**Port**: 3001  
**Pods**: 2 replicas  
**Status**: ✅ LIVE & OPERATIONAL  
**Base URL**: `https://98.70.245.87/api/auth`

#### Authentication & User Management APIs

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| **POST** | `/api/auth/login` | User login with email/employee ID and password | Public |
| **POST** | `/api/auth/register` | Register new user | Admin, HR |
| **POST** | `/api/auth/logout` | Logout user | Authenticated |
| **POST** | `/api/auth/refresh-token` | Refresh access token | Authenticated |
| **GET** | `/api/auth/profile` | Get user profile | Authenticated |
| **PUT** | `/api/auth/profile` | Update user profile | Authenticated |
| **POST** | `/api/auth/change-password` | Change password | Authenticated |
| **POST** | `/api/auth/request-password-reset` | Request password reset | Public |
| **POST** | `/api/auth/reset-password` | Reset password with token | Public |
| **GET** | `/api/auth/status` | Service status check | Public |
| **GET** | `/api/auth/health` | Health check | Public |

#### Real Users Management APIs

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| **POST** | `/api/real-users/register` | Register real user | HR, Admin |
| **GET** | `/api/real-users` | Get all real users | HR, Admin |
| **GET** | `/api/real-users/:id` | Get user by ID | HR, Admin |
| **PUT** | `/api/real-users/:id` | Update user | HR, Admin |
| **DELETE** | `/api/real-users/:id` | Deactivate user | HR, Admin |
| **GET** | `/api/real-users/profile` | Get user profile | Authenticated |
| **PUT** | `/api/real-users/profile` | Update user profile | Authenticated |

#### Permission & Role Management APIs

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| **GET** | `/api/permission/users` | Get all users with permissions | Admin |
| **POST** | `/api/permission/users/:userId/permissions` | Assign permissions to user | Admin |
| **GET** | `/api/user/me` | Get current user details | Authenticated |

#### Emergency Lock APIs

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| **POST** | `/api/emergency/lock` | Emergency lock system | Admin |
| **POST** | `/api/emergency/unlock` | Unlock emergency lock | Admin |
| **GET** | `/api/emergency/status` | Get emergency status | Admin |

#### Mock & Test APIs

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| **POST** | `/api/auth/mock-login` | Mock login for testing | Public (Dev) |

---

### ✅ 2. HR SERVICE
**Service Name**: `hr-service`  
**Port**: 3002  
**Pods**: 2 replicas  
**Status**: ✅ LIVE & OPERATIONAL  
**Base URL**: `https://98.70.245.87/api/hr`

#### Employee Management APIs

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| **GET** | `/api/hr/employees` | Get all employees (with pagination, filters) | HR, Admin |
| **GET** | `/api/hr/employees/:id` | Get employee by ID | HR, Admin, Manager |
| **POST** | `/api/hr/employees` | Create new employee | HR, Admin |
| **PUT** | `/api/hr/employees/:id` | Update employee details | HR, Admin |
| **DELETE** | `/api/hr/employees/:id` | Delete employee | Admin |
| **POST** | `/api/hr/employees/:id/assign-role` | Assign role to employee | Admin |
| **PUT** | `/api/hr/employees/:id/status` | Update employee status | HR, Admin |

#### Store Management APIs

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| **GET** | `/api/hr/stores` | Get all stores | HR, Admin, Manager |
| **GET** | `/api/hr/stores/:id` | Get store by ID | HR, Admin, Manager |
| **POST** | `/api/hr/stores` | Create new store | Admin |
| **PUT** | `/api/hr/stores/:id` | Update store details | Admin |
| **DELETE** | `/api/hr/stores/:id` | Delete store | Admin |

#### Onboarding APIs

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| **POST** | `/api/hr/onboarding` | Create onboarding record | HR, Admin |
| **GET** | `/api/hr/onboarding/:id` | Get onboarding details | HR, Admin |
| **PUT** | `/api/hr/onboarding/:id/work-details` | Update work details | HR, Admin |
| **PUT** | `/api/hr/onboarding/:id/statutory` | Update statutory details | HR, Admin |
| **POST** | `/api/hr/onboarding/:id/complete` | Complete onboarding | HR, Admin |
| **GET** | `/api/hr/onboarding/drafts` | Get draft onboarding records | HR, Admin |

#### Leave Management APIs

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| **GET** | `/api/hr/leave` | Get all leave requests | HR, Admin, Manager |
| **GET** | `/api/hr/leave/:id` | Get leave request by ID | Employee, HR, Admin |
| **POST** | `/api/hr/leave` | Create leave request | Employee |
| **PUT** | `/api/hr/leave/:id` | Update leave request | Employee |
| **DELETE** | `/api/hr/leave/:id` | Cancel leave request | Employee |
| **POST** | `/api/hr/leave/:id/approve` | Approve leave request | Manager, HR, Admin |
| **POST** | `/api/hr/leave/:id/reject` | Reject leave request | Manager, HR, Admin |
| **GET** | `/api/hr/leave/balance` | Get leave balance | Employee |

#### Transfer Management APIs

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| **GET** | `/api/transfers` | Get all transfer requests | HR, Admin |
| **GET** | `/api/transfers/:id` | Get transfer by ID | HR, Admin |
| **POST** | `/api/transfers` | Create transfer request | HR, Admin |
| **PUT** | `/api/transfers/:id` | Update transfer | HR, Admin |
| **DELETE** | `/api/transfers/:id` | Delete transfer | HR, Admin |
| **POST** | `/api/transfers/:id/approve` | Approve transfer | Admin |
| **POST** | `/api/transfers/:id/reject` | Reject transfer | Admin |

#### HR Letter Management APIs

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| **GET** | `/api/hr-letter` | Get all HR letters | HR, Admin |
| **GET** | `/api/hr-letter/:id` | Get letter by ID | Employee, HR, Admin |
| **POST** | `/api/hr-letter` | Create HR letter | HR, Admin |
| **PUT** | `/api/hr-letter/:id` | Update HR letter | HR, Admin |
| **DELETE** | `/api/hr-letter/:id` | Delete HR letter | Admin |
| **POST** | `/api/hr-letter/:id/generate` | Generate letter PDF | HR, Admin |
| **POST** | `/api/hr-letter/:id/send` | Send letter via email | HR, Admin |

#### Admin Management APIs

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| **GET** | `/api/admin/users` | Get all system users | Admin |
| **GET** | `/api/admin/roles` | Get all roles | Admin |
| **POST** | `/api/admin/roles` | Create new role | Admin |
| **PUT** | `/api/admin/roles/:id` | Update role | Admin |
| **DELETE** | `/api/admin/roles/:id` | Delete role | Admin |
| **GET** | `/api/admin/system-settings` | Get system settings | Admin |
| **PUT** | `/api/admin/system-settings` | Update system settings | Admin |

#### Health & Status APIs

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| **GET** | `/api/hr/health` | Health check | Public |
| **GET** | `/api/hr/status` | Service status | Public |
| **GET** | `/api/hr` | Service info & available endpoints | Public |

---

### ✅ 3. ATTENDANCE SERVICE
**Service Name**: `attendance-service`  
**Port**: 3003  
**Pods**: 2 replicas  
**Status**: ✅ LIVE & OPERATIONAL  
**Base URL**: `https://98.70.245.87/api/attendance`

#### Attendance Management APIs

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| **POST** | `/api/attendance/clock-in` | Clock in with location & selfie | Employee |
| **POST** | `/api/attendance/clock-out` | Clock out with location | Employee |
| **GET** | `/api/attendance/history` | Get attendance history | Employee |
| **GET** | `/api/attendance/summary` | Get attendance summary | Employee, Manager, HR |
| **GET** | `/api/attendance` | Get all attendance records | HR, Admin |
| **POST** | `/api/attendance` | Mark attendance (manual) | HR, Admin |
| **GET** | `/api/attendance/records` | Get attendance records | HR, Admin |
| **GET** | `/api/attendance/reports` | Get attendance reports | HR, Admin, Manager |

#### Geofencing APIs

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| **GET** | `/api/geofencing/zones` | Get all geofencing zones | HR, Admin |
| **GET** | `/api/geofencing/zones/:id` | Get zone by ID | HR, Admin |
| **POST** | `/api/geofencing/zones` | Create geofencing zone | Admin |
| **PUT** | `/api/geofencing/zones/:id` | Update geofencing zone | Admin |
| **DELETE** | `/api/geofencing/zones/:id` | Delete geofencing zone | Admin |
| **POST** | `/api/geofencing/validate` | Validate location against zone | Employee |

#### Security & Monitoring APIs

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| **GET** | `/api/security/alerts` | Get security alerts | HR, Admin |
| **POST** | `/api/security/report` | Report security incident | Employee |
| **GET** | `/api/security/logs` | Get security logs | Admin |

#### Health & Status APIs

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| **GET** | `/api/attendance/health` | Health check | Public |
| **GET** | `/api/attendance/status` | Service status | Public |

---

## 📊 Summary Statistics

| Metric | Count |
|--------|-------|
| **Total Services** | 3 |
| **Total Pods** | 6 (2 per service) |
| **Total API Endpoints** | ~100+ |
| **Auth Service APIs** | 25+ |
| **HR Service APIs** | 50+ |
| **Attendance Service APIs** | 20+ |

---

## 🔐 Authentication & Authorization

### Authentication Flow
1. **Login**: POST `/api/auth/login` with `emailOrEmployeeId` and `password`
2. **Receive Token**: Get `accessToken` and `refreshToken` in response
3. **Use Token**: Include `Authorization: Bearer <accessToken>` header in all protected API calls
4. **Refresh Token**: Use `/api/auth/refresh-token` when access token expires

### User Roles
- **SuperAdmin**: Full system access
- **Admin**: Administrative access to all modules
- **HR**: Human resources management access
- **Manager**: Team and store management access
- **Employee**: Self-service access
- **Accounts**: Financial and payroll access

### Permissions
Each role has specific permissions like:
- `user:read`, `user:write`, `user:delete`
- `attendance:read`, `attendance:create`, `attendance:update`
- `leave:approve`, `leave:reject`
- `employee:manage`, `store:manage`

---

## 🌐 Access Information

### Production URL
```
https://98.70.245.87/api/<service>/<endpoint>
```

### Required Headers
```javascript
{
  'Host': 'api.etelios.com',
  'Content-Type': 'application/json',
  'Authorization': 'Bearer <your-token>' // For protected endpoints
}
```

### Example Request (JavaScript)
```javascript
// Login
const loginResponse = await fetch('https://98.70.245.87/api/auth/login', {
  method: 'POST',
  headers: {
    'Host': 'api.etelios.com',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    emailOrEmployeeId: 'user@example.com',
    password: 'password123'
  })
});

const { accessToken } = await loginResponse.json();

// Use token for protected endpoint
const employeesResponse = await fetch('https://98.70.245.87/api/hr/employees', {
  method: 'GET',
  headers: {
    'Host': 'api.etelios.com',
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### Example Request (cURL)
```bash
# Login
curl -X POST https://98.70.245.87/api/auth/login \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{"emailOrEmployeeId": "user@example.com", "password": "password123"}'

# Get employees (with token)
curl -X GET https://98.70.245.87/api/hr/employees \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <your-token>"
```

---

## 📋 Common Query Parameters

### Pagination
```
?page=1&limit=10
```

### Filtering
```
?status=active&department=IT&role=employee
```

### Date Range
```
?startDate=2025-01-01&endDate=2025-12-31
```

### Sorting
```
?sortBy=createdAt&order=desc
```

### Search
```
?search=john&searchFields=name,email,employeeId
```

---

## ⚠️ Important Notes

1. **SSL Certificate**: Currently using self-signed certificate, use `-k` flag in cURL or disable SSL verification in dev
2. **Rate Limiting**: 100 requests per minute per IP
3. **CORS**: Configured for cross-origin requests
4. **API Versioning**: Currently v1 (implicit), future versions will use `/v2/` prefix
5. **Response Format**: All APIs return JSON with standard structure:
   ```json
   {
     "success": true/false,
     "message": "Description",
     "data": {...},
     "error": "Error message if failed"
   }
   ```

---

## 🚀 Next Steps for Full Deployment

### Remaining Services (Not Yet Deployed)
1. **Payroll Service** (Port 3004)
2. **CRM Service** (Port 3005)
3. **Inventory Service** (Port 3006)
4. **Sales Service** (Port 3007)
5. **Purchase Service** (Port 3008)
6. **Financial Service** (Port 3009)
7. **Document Service** (Port 3010)
8. **Service Management** (Port 3011)
9. **CPP Service** (Port 3012)
10. **Prescription Service** (Port 3013)
11. **Analytics Service** (Port 3014)
12. **Notification Service** (Port 3015)
13. **Monitoring Service** (Port 3016)
14. **Tenant Registry Service** (Port 3020)
15. **Realtime Service (WebSocket)** (Port 3021)

---

## 📞 Support & Documentation

- **Frontend Integration Guide**: `FRONTEND_INTEGRATION.md`
- **Frontend Developer Guide**: `FRONTEND_DEVELOPER_GUIDE.md`
- **DevOps Guide**: `DEVOPS_GUIDE.md`
- **Architecture Diagram**: `COMPLETE_ARCHITECTURE_DIAGRAM.txt`

---

**Last Updated**: December 30, 2025  
**Maintained By**: DevOps Team

