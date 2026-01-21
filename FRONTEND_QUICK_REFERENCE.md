# Frontend Developer Quick Reference

## Base Configuration

```javascript
const BASE_URL = 'https://98.70.245.87';
const API_HOST = 'api.etelios.com';

const defaultHeaders = {
  'Content-Type': 'application/json',
  'Host': API_HOST
};
```

## Common Headers

```javascript
// Authenticated request
{
  ...defaultHeaders,
  'Authorization': `Bearer ${token}`,
  'X-Tenant-Id': tenantId
}
```

## Quick API Calls

### 1. Super Admin Login
```javascript
POST /api/auth/login
Body: { emailOrEmployeeId, password }
Response: { success, data: { accessToken, refreshToken, user } }
```

### 2. Create Tenant
```javascript
POST /api/tenants
Headers: { Authorization: `Bearer ${superAdminToken}` }
Body: {
  name: "Company Name",
  email: "admin@company.com",
  domain: "company",
  subdomain: "company",
  plan: "enterprise",
  modules: ["hr", "analytics", "reports"]
}
Response: { success, data: { tenantId, adminUser: { email, temporaryPassword } } }
```

### 3. Admin Login (First Time)
```javascript
POST /api/auth/login
Headers: { 'X-Tenant-Id': tenantId }
Body: { emailOrEmployeeId, password }
Response: { success, mustChangePassword: true, data: { accessToken, user } }
```

### 4. Change Password
```javascript
POST /api/auth/change-password
Headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Id': tenantId }
Body: { currentPassword, newPassword }
Response: { success, message: "Password changed successfully" }
```

### 5. Create Employee
```javascript
POST /api/hr/employees
Headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Id': tenantId }
Body: {
  employeeId: "EMP-001",
  firstName: "John",
  lastName: "Doe",
  email: "john@company.com",
  gender: "Male",  // NEW: Required
  roleName: "employee",
  department: "Sales"
}
Response: { success, data: { employeeId, fullName, gender, ... } }
```

### 6. Add Work Details (with Salary)
```javascript
POST /api/hr/onboarding/work-details
Headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Id': tenantId }
Body: {
  employeeId: "EMP-001",
  jobTitle: "Sales Manager",
  department: "Sales",
  joining_date: "2026-01-20",
  annual_ctc: 720000,  // NEW: Optional
  salary_breakdown: {  // NEW: Optional
    basic: 360000,
    hra: 144000,
    special_allowance: 120000,
    pf_employer: 43200,
    gratuity: 28800,
    other_allowances: 24000
  }
}
Response: { success, data: { employeeId, annual_ctc, salary_breakdown } }
```

### 7. Get Employee
```javascript
GET /api/hr/employees/:employeeId
Headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Id': tenantId }
Response: { success, data: { employeeId, gender, annual_ctc, salary_breakdown, ... } }
```

## New Fields Reference

### Gender Field
- **Location**: Employee creation, personal details
- **Type**: String (enum)
- **Values**: `"Male"`, `"Female"`, `"Other"`
- **Required**: Yes (in employee creation)
- **Example**: `gender: "Male"`

### Annual CTC Field
- **Location**: Work details
- **Type**: Number
- **Min**: 0
- **Required**: No
- **Example**: `annual_ctc: 720000`

### Salary Breakdown Field
- **Location**: Work details
- **Type**: Object
- **Required**: No
- **Structure**:
```javascript
{
  basic: 360000,           // Number, min: 0
  hra: 144000,              // Number, min: 0
  special_allowance: 120000, // Number, min: 0
  pf_employer: 43200,      // Number, min: 0
  gratuity: 28800,          // Number, min: 0
  other_allowances: 24000   // Number, min: 0
}
```

## Complete Flow Checklist

- [ ] Super Admin login
- [ ] Create tenant
- [ ] Store admin credentials (email, temporary password)
- [ ] Admin first login (with temporary password)
- [ ] Check `mustChangePassword` flag
- [ ] Change password (if required)
- [ ] Login again (with new password)
- [ ] Create employee (with `gender` field)
- [ ] Add work details (with `annual_ctc` and `salary_breakdown`)
- [ ] Verify employee (GET request to check all fields)

## Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Validation Error | Check `errors` array |
| 401 | Unauthorized | Redirect to login |
| 403 | Forbidden | Check user role |
| 404 | Not Found | Verify resource exists |
| 409 | Conflict | Resource already exists |
| 500 | Server Error | Retry or contact support |

## Common Patterns

### Fetch with Auth
```javascript
async function apiCall(endpoint, method = 'GET', body = null, token, tenantId) {
  const headers = {
    'Content-Type': 'application/json',
    'Host': 'api.etelios.com'
  };
  
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (tenantId) headers['X-Tenant-Id'] = tenantId;
  
  const options = {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) })
  };
  
  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }
  
  return data;
}
```

### Handle Password Change Flow
```javascript
async function handlePasswordChange(email, tempPassword, newPassword, tenantId) {
  // 1. Login with temp password
  const login1 = await apiCall('/api/auth/login', 'POST', {
    emailOrEmployeeId: email,
    password: tempPassword
  }, null, tenantId);
  
  if (!login1.mustChangePassword) {
    return login1.data.accessToken;
  }
  
  // 2. Change password
  await apiCall('/api/auth/change-password', 'POST', {
    currentPassword: tempPassword,
    newPassword: newPassword
  }, login1.data.accessToken, tenantId);
  
  // 3. Login with new password
  const login2 = await apiCall('/api/auth/login', 'POST', {
    emailOrEmployeeId: email,
    password: newPassword
  }, null, tenantId);
  
  return login2.data.accessToken;
}
```

## Test Scripts Location

- `create-lenstrack-tenant.js` - Create tenant script
- `test-complete-lenstrack-flow.js` - Complete flow test

## Important Notes

1. **Always include `X-Tenant-Id` header** for tenant-specific requests
2. **Temporary passwords** must be changed on first login
3. **Gender field is required** when creating employees
4. **Salary fields are optional** but recommended for complete employee data
5. **Token expiration**: Implement refresh logic
6. **Error handling**: Always check `success` field in response

---

**For detailed documentation, see**: `FRONTEND_TENANT_CREATION_AND_FLOW_GUIDE.md`
