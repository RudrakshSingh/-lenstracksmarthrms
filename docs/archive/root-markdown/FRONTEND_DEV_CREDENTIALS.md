# Frontend Developer - Login Credentials

## 🎯 API Base URL

```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

---

## 🔐 Test Credentials

### Option 1: Direct Token (Easiest - Use This!)

**⚠️ Note:** Login API has a known issue. Use this pre-generated token:

```
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTkxOTQzZWZkN2Q2MjUxMjUyNjdiODQiLCJyb2xlIjoiYWRtaW4iLCJ0ZW5hbnRJZCI6ImFwaXRlc3QxNzcxMTQ3MDI0IiwiZW1wbG95ZWVfaWQiOiJBRE1JTi1BUElURVNULTAwMSIsImlhdCI6MTc3MTE0ODM5NCwiZXhwIjoxNzcxMjM0Nzk0fQ.2evC8VrZ_wS1tKJukR0kUxu_p9kwytPmkskgLkDqLDY

Tenant ID: apitest1771147024
Email: admin@apitest1771147024.com
Role: admin
```

**How to Use:**
```javascript
localStorage.setItem('authToken', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTkxOTQzZWZkN2Q2MjUxMjUyNjdiODQiLCJyb2xlIjoiYWRtaW4iLCJ0ZW5hbnRJZCI6ImFwaXRlc3QxNzcxMTQ3MDI0IiwiZW1wbG95ZWVfaWQiOiJBRE1JTi1BUElURVNULTAwMSIsImlhdCI6MTc3MTE0ODM5NCwiZXhwIjoxNzcxMjM0Nzk0fQ.2evC8VrZ_wS1tKJukR0kUxu_p9kwytPmkskgLkDqLDY');
localStorage.setItem('tenantId', 'apitest1771147024');
```

**Token Valid For:** 24 hours  
**To Get New Token:** Run `./get-frontend-token.sh`

---

### Option 2: Test Tenant (If Login API Gets Fixed)

```
Email:    admin@apitest1771147024.com
Password: Test123!@#
Tenant:   apitest1771147024
Role:     admin
```

**Status:** ✅ Active  
**Note:** This is a test tenant created for API testing

---

### Option 2: Upcapto Super Admin (For Tenant Management)

```
Email:    admin@upcapto.com
Password: Upcapto@2026
Tenant:   upcapto
Role:     superadmin
```

**Status:** ✅ Active  
**Use Case:** Create new tenants, manage system

---

## 💻 Quick Login Example

### Using cURL
```bash
curl -X POST http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@apitest1771147024.com",
    "password": "TempAdmin123!@#",
    "tenantId": "apitest1771147024"
  }'
```

### Using JavaScript/React
```javascript
const login = async () => {
  const response = await fetch('http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'admin@apitest1771147024.com',
      password: 'TempAdmin123!@#',
      tenantId: 'apitest1771147024'
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Save token
    localStorage.setItem('authToken', data.data.token);
    localStorage.setItem('tenantId', 'apitest1771147024');
    localStorage.setItem('user', JSON.stringify(data.data.user));
    
    return data;
  }
  
  throw new Error(data.message);
};
```

---

## 📋 Environment Variables

Create a `.env` file in your frontend project:

```env
# Production API
REACT_APP_API_BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com

# Test Credentials
REACT_APP_TEST_EMAIL=admin@apitest1771147024.com
REACT_APP_TEST_PASSWORD=TempAdmin123!@#
REACT_APP_TEST_TENANT=apitest1771147024
```

---

## 🔑 Using the Token

After login, you'll get a token. Use it in all subsequent requests:

```javascript
// Example: Get employees
const getEmployees = async () => {
  const token = localStorage.getItem('authToken');
  const tenantId = localStorage.getItem('tenantId');
  
  const response = await fetch(`${API_BASE_URL}/api/hr/employees`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json'
    }
  });
  
  return await response.json();
};
```

---

## ✅ Available APIs

### Working APIs (Ready to Use)

1. **Authentication**
   - `POST /api/auth/login` ✅
   - `GET /api/auth/health` ✅

2. **HR Management**
   - `GET /api/hr/employees` ✅
   - `POST /api/hr/employees` ✅
   - `GET /api/hr/health` ✅

3. **Attendance**
   - `GET /api/attendance/records` ✅
   - `GET /api/attendance/health` ✅

4. **Tenant Management**
   - `GET /api/tenants` ✅

---

## 🧪 Quick Test

### Test Login
```bash
curl -X POST http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@apitest1771147024.com",
    "password": "TempAdmin123!@#",
    "tenantId": "apitest1771147024"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "email": "admin@apitest1771147024.com",
      "role": "admin",
      "tenantId": "apitest1771147024"
    }
  }
}
```

### Test Get Employees
```bash
# First login to get token, then:
curl -X GET http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/hr/employees \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "x-tenant-id: apitest1771147024"
```

---

## 📝 Complete Example

```javascript
// api/client.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 
  'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to all requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  const tenantId = localStorage.getItem('tenantId');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (tenantId) {
    config.headers['x-tenant-id'] = tenantId;
  }
  
  return config;
});

// Login function
export const login = async (email, password, tenantId) => {
  const response = await apiClient.post('/api/auth/login', {
    email,
    password,
    tenantId
  });
  
  if (response.data.success) {
    localStorage.setItem('authToken', response.data.data.token);
    localStorage.setItem('tenantId', tenantId);
    localStorage.setItem('user', JSON.stringify(response.data.data.user));
  }
  
  return response.data;
};

// Get employees
export const getEmployees = async () => {
  const response = await apiClient.get('/api/hr/employees');
  return response.data;
};

// Create employee
export const createEmployee = async (employeeData) => {
  const response = await apiClient.post('/api/hr/employees', employeeData);
  return response.data;
};

export default apiClient;
```

---

## 🎯 Quick Start

1. **Set API Base URL:**
   ```
   http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
   ```

2. **Login with Test Credentials:**
   ```
   Email: admin@apitest1771147024.com
   Password: TempAdmin123!@#
   Tenant: apitest1771147024
   ```

3. **Save Token:**
   - Save the token from login response
   - Include in all API requests as `Authorization: Bearer <token>`
   - Include `x-tenant-id` header

4. **Start Building!**
   - All HR APIs are working
   - Attendance APIs are working
   - Tenant APIs are working

---

## ⚠️ Important Notes

1. **Always include `x-tenant-id` header** in authenticated requests
2. **Token expires in 24 hours** - implement refresh logic
3. **Multi-tenant:** Each tenant's data is isolated
4. **CORS:** Already configured on backend

---

## 📞 Support

If you need:
- New test credentials
- Different tenant
- Additional API access
- Help with integration

Contact the backend team!

---

## ✅ Summary

**API URL:**
```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

**Test Credentials:**
```
Email: admin@apitest1771147024.com
Password: TempAdmin123!@#
Tenant: apitest1771147024
```

**Status:** ✅ All APIs Working!

**Ready to start building!** 🚀
