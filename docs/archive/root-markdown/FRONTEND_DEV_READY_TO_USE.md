# Frontend Dev - Ready to Use Credentials

## 🚀 Quick Start (Copy-Paste Ready!)

### API Base URL
```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

### Pre-Generated Token (Use This Now!)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTkxOTQzZWZkN2Q2MjUxMjUyNjdiODQiLCJyb2xlIjoiYWRtaW4iLCJ0ZW5hbnRJZCI6ImFwaXRlc3QxNzcxMTQ3MDI0IiwiZW1wbG95ZWVfaWQiOiJBRE1JTi1BUElURVNULTAwMSIsImlhdCI6MTc3MTE0ODM5NCwiZXhwIjoxNzcxMjM0Nzk0fQ.2evC8VrZ_wS1tKJukR0kUxu_p9kwytPmkskgLkDqLDY
```

### Tenant ID
```
apitest1771147024
```

---

## 💻 React Setup (Copy-Paste)

### .env file
```env
REACT_APP_API_BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
REACT_APP_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTkxOTQzZWZkN2Q2MjUxMjUyNjdiODQiLCJyb2xlIjoiYWRtaW4iLCJ0ZW5hbnRJZCI6ImFwaXRlc3QxNzcxMTQ3MDI0IiwiZW1wbG95ZWVfaWQiOiJBRE1JTi1BUElURVNULTAwMSIsImlhdCI6MTc3MTE0ODM5NCwiZXhwIjoxNzcxMjM0Nzk0fQ.2evC8VrZ_wS1tKJukR0kUxu_p9kwytPmkskgLkDqLDY
REACT_APP_TENANT_ID=apitest1771147024
```

### api/client.js
```javascript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const TOKEN = process.env.REACT_APP_TOKEN;
const TENANT_ID = process.env.REACT_APP_TENANT_ID;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TOKEN}`,
    'x-tenant-id': TENANT_ID
  }
});

export default apiClient;
```

### Usage Example
```javascript
import apiClient from './api/client';

// Get employees
const getEmployees = async () => {
  const response = await apiClient.get('/api/hr/employees');
  return response.data;
};

// Create employee
const createEmployee = async (data) => {
  const response = await apiClient.post('/api/hr/employees', data);
  return response.data;
};

// Get attendance records
const getAttendance = async () => {
  const response = await apiClient.get('/api/attendance/records');
  return response.data;
};
```

---

## 🧪 Quick Test

```bash
# Test Get Employees
curl -X GET \
  http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/hr/employees \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTkxOTQzZWZkN2Q2MjUxMjUyNjdiODQiLCJyb2xlIjoiYWRtaW4iLCJ0ZW5hbnRJZCI6ImFwaXRlc3QxNzcxMTQ3MDI0IiwiZW1wbG95ZWVfaWQiOiJBRE1JTi1BUElURVNULTAwMSIsImlhdCI6MTc3MTE0ODM5NCwiZXhwIjoxNzcxMjM0Nzk0fQ.2evC8VrZ_wS1tKJukR0kUxu_p9kwytPmkskgLkDqLDY" \
  -H "x-tenant-id: apitest1771147024"
```

---

## ✅ Working APIs

1. ✅ `GET /api/hr/employees` - Get all employees
2. ✅ `POST /api/hr/employees` - Create employee
3. ✅ `GET /api/attendance/records` - Get attendance
4. ✅ `GET /api/tenants` - Get tenant info
5. ✅ All health checks

---

## 📝 Summary

**API URL:**
```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

**Token:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTkxOTQzZWZkN2Q2MjUxMjUyNjdiODQiLCJyb2xlIjoiYWRtaW4iLCJ0ZW5hbnRJZCI6ImFwaXRlc3QxNzcxMTQ3MDI0IiwiZW1wbG95ZWVfaWQiOiJBRE1JTi1BUElURVNULTAwMSIsImlhdCI6MTc3MTE0ODM5NCwiZXhwIjoxNzcxMjM0Nzk0fQ.2evC8VrZ_wS1tKJukR0kUxu_p9kwytPmkskgLkDqLDY
```

**Tenant ID:**
```
apitest1771147024
```

**Headers for all requests:**
```
Authorization: Bearer <token>
x-tenant-id: apitest1771147024
```

---

**Ready to use! Just copy-paste and start coding!** 🚀
