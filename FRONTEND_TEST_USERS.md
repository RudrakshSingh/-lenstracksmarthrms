# 🔐 Test Users for Frontend Development

## ✅ Ready-to-Use Test Credentials

These test users are **already created** in the database and ready to use immediately!

---

## 📋 Test User Credentials

### 1. 👨‍💼 Admin User (Full Access)
```
Email:       admin@test.com
Employee ID: EMP001
Password:    Admin@123
Role:        Admin
Department:  IT
```

**Access Level**: Full system access, can manage all modules

**Test Login:**
```bash
curl -k -X POST https://98.70.245.87/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"emailOrEmployeeId":"admin@test.com","password":"Admin@123"}'
```

---

### 2. 👥 HR User (HR Management)
```
Email:       hr@test.com
Employee ID: EMP002
Password:    HR@123
Role:        HR
Department:  Human Resources
```

**Access Level**: Employee management, leave approval, onboarding, HR letters

**Test Login:**
```bash
curl -k -X POST https://98.70.245.87/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"emailOrEmployeeId":"hr@test.com","password":"HR@123"}'
```

---

### 3. 👤 Employee User (Self-Service)
```
Email:       employee@test.com
Employee ID: EMP003
Password:    Employee@123
Role:        Employee
Department:  Sales
```

**Access Level**: Self-service (profile, attendance, leave requests)

**Test Login:**
```bash
curl -k -X POST https://98.70.245.87/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"emailOrEmployeeId":"employee@test.com","password":"Employee@123"}'
```

---

### 4. 👨‍💼 Manager User (Team Management)
```
Email:       manager@test.com
Employee ID: EMP004
Password:    Manager@123
Role:        Manager
Department:  Operations
```

**Access Level**: Team management, leave approval, attendance reports

**Test Login:**
```bash
curl -k -X POST https://98.70.245.87/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"emailOrEmployeeId":"manager@test.com","password":"Manager@123"}'
```

---

## 🚀 Quick Start for Frontend

### Step 1: Test Login in Browser Console

Open your browser console (F12) and run:

```javascript
// Test Admin Login
fetch('https://98.70.245.87/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    emailOrEmployeeId: 'admin@test.com',
    password: 'Admin@123'
  })
})
.then(res => res.json())
.then(data => {
  console.log('✅ Login Success:', data);
  // Store token
  localStorage.setItem('accessToken', data.data.accessToken);
  localStorage.setItem('user', JSON.stringify(data.data.user));
})
.catch(err => console.error('❌ Login Failed:', err));
```

### Step 2: Use Token for API Calls

```javascript
// Get stored token
const token = localStorage.getItem('accessToken');

// Example: Get employees (Admin/HR only)
fetch('https://98.70.245.87/api/hr/employees', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(res => res.json())
.then(data => console.log('Employees:', data));

// Example: Clock in (Employee)
fetch('https://98.70.245.87/api/attendance/clock-in', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    latitude: 28.6139,
    longitude: 77.2090,
    notes: 'On time'
  })
})
.then(res => res.json())
.then(data => console.log('Clock In:', data));
```

---

## 📊 Expected Login Response

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "...",
      "employee_id": "EMP001",
      "name": "Test Admin",
      "email": "admin@test.com",
      "role": "admin",
      "department": "IT",
      "designation": "System Administrator",
      "status": "active"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 🔑 Login with Employee ID

You can also login using Employee ID instead of email:

```javascript
fetch('https://98.70.245.87/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    emailOrEmployeeId: 'EMP001',  // ← Using Employee ID
    password: 'Admin@123'
  })
})
```

---

## 🎯 Role-Based Access Examples

### Admin Can:
- ✅ Manage all employees
- ✅ Create/update/delete users
- ✅ Access all reports
- ✅ Manage system settings
- ✅ Approve/reject all requests

### HR Can:
- ✅ Manage employees
- ✅ Process onboarding
- ✅ Approve leave requests
- ✅ Generate HR letters
- ✅ View attendance reports

### Manager Can:
- ✅ View team members
- ✅ Approve team leave requests
- ✅ View team attendance
- ✅ Generate team reports

### Employee Can:
- ✅ View own profile
- ✅ Clock in/out
- ✅ Apply for leave
- ✅ View own attendance history
- ✅ Update personal info

---

## 🧪 Complete React Login Example

```javascript
import { useState } from 'react';

const API_BASE = 'https://98.70.245.87';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailOrEmployeeId: email,
          password: password
        })
      });

      const data = await response.json();

      if (data.success) {
        // Store tokens
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        
        // Redirect or update state
        console.log('Login successful!', data.data.user);
        // Navigate to dashboard
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="text"
        placeholder="Email or Employee ID"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
      {error && <p style={{color: 'red'}}>{error}</p>}
    </form>
  );
}

export default LoginForm;
```

---

## ⚠️ Important Notes

1. **SSL Certificate**: The IP uses a self-signed certificate. Accept it in browser first by visiting `https://98.70.245.87`

2. **Token Expiry**: 
   - Access Token: 15 minutes
   - Refresh Token: 7 days

3. **CORS**: Already enabled for all origins

4. **Rate Limiting**: 100 requests per minute

5. **Password Requirements**: 
   - Minimum 6 characters
   - Should contain uppercase, lowercase, number, special char (for production)

---

## 🔄 Token Refresh

When access token expires:

```javascript
const refreshToken = localStorage.getItem('refreshToken');

fetch('https://98.70.245.87/api/auth/refresh-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    refreshToken: refreshToken
  })
})
.then(res => res.json())
.then(data => {
  localStorage.setItem('accessToken', data.data.accessToken);
});
```

---

## 📞 Need Help?

- **API Documentation**: See `DEPLOYED_SERVICES_AND_APIS.md`
- **Troubleshooting**: See `FRONTEND_WORKING_SOLUTION.md`
- **Architecture**: See `COMPLETE_ARCHITECTURE_DIAGRAM.txt`

---

**Status**: ✅ All test users are live and ready to use!  
**Last Updated**: December 30, 2025

