# Frontend Developer - Quick Reference Card

## 🚀 5-Minute Setup

### 1. Base Configuration
```javascript
const API_BASE = 'https://98.70.245.87';
const API_HOST = 'api.etelios.com';
```

### 2. Login (Choose One)

**Option A: Mock Login (Fast - Recommended for Testing)**
```javascript
const response = await fetch(`${API_BASE}/api/auth/mock-login-fast`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Host': API_HOST
  },
  body: JSON.stringify({ role: 'admin' })
});
const { data } = await response.json();
localStorage.setItem('accessToken', data.accessToken);
localStorage.setItem('refreshToken', data.refreshToken);
```

**Option B: Real Login**
```javascript
const response = await fetch(`${API_BASE}/api/auth/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Host': API_HOST
  },
  body: JSON.stringify({
    emailOrEmployeeId: 'user@example.com',
    password: 'password'
  })
});
```

### 3. Make Authenticated Request
```javascript
const token = localStorage.getItem('accessToken');
const response = await fetch(`${API_BASE}/api/hr/employees?status=active&limit=100`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Host': API_HOST
  }
});
const data = await response.json();
```

---

## 🔑 Bearer Token Pattern

```javascript
// Every authenticated request needs:
headers: {
  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
  'Host': 'api.etelios.com',
  'Content-Type': 'application/json'
}
```

---

## 📋 Common API Calls

### Get Employees
```javascript
GET /api/hr/employees?status=active&limit=100
Headers: { 'Authorization': 'Bearer <token>', 'Host': 'api.etelios.com' }
```

### Create Employee
```javascript
POST /api/hr/employees
Headers: { 'Authorization': 'Bearer <token>', 'Host': 'api.etelios.com' }
Body: { employeeId, firstName, lastName, email, password, roleName, ... }
```

### Get Departments
```javascript
GET /api/hr/departments
Headers: { 'Authorization': 'Bearer <token>', 'Host': 'api.etelios.com' }
```

### Clock In
```javascript
POST /api/attendance/clock-in
Headers: { 'Authorization': 'Bearer <token>', 'Host': 'api.etelios.com' }
Body: { latitude, longitude, notes }
```

---

## ⚠️ Critical Notes

1. **ALWAYS include `Host: api.etelios.com` header**
2. **Token format:** `Bearer <token>` (with space)
3. **Status values:** Accepts both `active` and `ACTIVE` (uppercase)
4. **Limit max:** Up to 1000 (not just 100)
5. **Use HTTPS:** Always use `https://` not `http://`

---

## 🧪 Test Credentials

**Mock Login (No Password Needed):**
```javascript
{ role: 'admin' }  // or 'hr', 'manager', 'employee', 'superadmin'
```

**Real Login:**
- Email: `superadmin@etelios.com`
- Password: (check with backend team)

---

## 📚 Full Documentation

See `FRONTEND_COMPLETE_TESTING_GUIDE.md` for:
- Complete API reference
- React/Axios examples
- Error handling
- Token refresh
- Troubleshooting

---

**Quick Help:**
- Base URL: `https://98.70.245.87`
- Host Header: `api.etelios.com` (REQUIRED)
- Mock Login: `/api/auth/mock-login-fast`
- Health Check: `/api/auth/health`

