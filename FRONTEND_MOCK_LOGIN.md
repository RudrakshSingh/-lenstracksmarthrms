# 🚀 Frontend Testing - Mock Login (Instant Access)

## ✅ Easiest Way for Frontend Testing

Use **Mock Login** - No password needed, instant access!

---

## 🎯 Mock Login Endpoint

```
POST https://98.70.245.87/api/auth/mock-login
```

**No password required!** Just specify the role you want to test.

---

## 📋 Quick Test Credentials

### 1. Admin User (Full Access)
```javascript
fetch('https://98.70.245.87/api/auth/mock-login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    role: 'admin',
    email: 'admin@test.com',
    name: 'Test Admin',
    employeeId: 'EMP001'
  })
})
.then(res => res.json())
.then(data => {
  console.log('✅ Logged in as Admin:', data);
  localStorage.setItem('accessToken', data.data.accessToken);
  localStorage.setItem('user', JSON.stringify(data.data.user));
});
```

### 2. HR User
```javascript
fetch('https://98.70.245.87/api/auth/mock-login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    role: 'hr',
    email: 'hr@test.com',
    name: 'Test HR',
    employeeId: 'EMP002'
  })
})
```

### 3. Employee User
```javascript
fetch('https://98.70.245.87/api/auth/mock-login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    role: 'employee',
    email: 'employee@test.com',
    name: 'Test Employee',
    employeeId: 'EMP003'
  })
})
```

### 4. Manager User
```javascript
fetch('https://98.70.245.87/api/auth/mock-login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    role: 'manager',
    email: 'manager@test.com',
    name: 'Test Manager',
    employeeId: 'EMP004'
  })
})
```

---

## 🔥 One-Click Test in Browser Console

Copy-paste this into your browser console (F12):

```javascript
// Test as Admin
fetch('https://98.70.245.87/api/auth/mock-login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    role: 'admin',
    email: 'admin@test.com',
    name: 'Test Admin'
  })
})
.then(res => res.json())
.then(data => {
  if (data.success) {
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('user', JSON.stringify(data.data.user));
    console.log('✅ Logged in as:', data.data.user.name);
    console.log('🔑 Token saved to localStorage');
    console.log('👤 User:', data.data.user);
  }
})
.catch(err => console.error('❌ Error:', err));
```

---

## 📊 Expected Response

```json
{
  "success": true,
  "message": "Mock login successful",
  "data": {
    "user": {
      "_id": "mock_admin_123",
      "employee_id": "EMP001",
      "name": "Test Admin",
      "email": "admin@test.com",
      "role": "admin",
      "department": "IT",
      "status": "active"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 🎨 Complete React Login Component

```javascript
import { useState } from 'react';

const API_BASE = 'https://98.70.245.87';

function QuickLogin() {
  const [loading, setLoading] = useState(false);

  const loginAs = async (role) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/mock-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: role,
          email: `${role}@test.com`,
          name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`
        })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        
        alert(`✅ Logged in as ${role}!`);
        // Navigate to dashboard
        window.location.href = '/dashboard';
      } else {
        alert('❌ Login failed: ' + data.message);
      }
    } catch (err) {
      alert('❌ Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Quick Test Login</h2>
      <button onClick={() => loginAs('admin')} disabled={loading}>
        Login as Admin
      </button>
      <button onClick={() => loginAs('hr')} disabled={loading}>
        Login as HR
      </button>
      <button onClick={() => loginAs('manager')} disabled={loading}>
        Login as Manager
      </button>
      <button onClick={() => loginAs('employee')} disabled={loading}>
        Login as Employee
      </button>
    </div>
  );
}

export default QuickLogin;
```

---

## 🔑 Available Roles

| Role | Access Level |
|------|--------------|
| `admin` | Full system access |
| `hr` | HR management, employee data |
| `manager` | Team management, approvals |
| `employee` | Self-service only |
| `superadmin` | Super admin (highest level) |

---

## 🧪 Testing Different Scenarios

### Test Admin Access:
```javascript
// 1. Mock login as admin
const adminLogin = await fetch('https://98.70.245.87/api/auth/mock-login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({role: 'admin'})
});
const adminData = await adminLogin.json();
const adminToken = adminData.data.accessToken;

// 2. Test admin endpoint
const employees = await fetch('https://98.70.245.87/api/hr/employees', {
  headers: {'Authorization': `Bearer ${adminToken}`}
});
console.log('Employees:', await employees.json());
```

### Test Employee Access:
```javascript
// 1. Mock login as employee
const empLogin = await fetch('https://98.70.245.87/api/auth/mock-login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({role: 'employee'})
});
const empData = await empLogin.json();
const empToken = empData.data.accessToken;

// 2. Test employee endpoint
const profile = await fetch('https://98.70.245.87/api/auth/profile', {
  headers: {'Authorization': `Bearer ${empToken}`}
});
console.log('Profile:', await profile.json());
```

---

## ⚡ Advantages of Mock Login

1. **No Password**: No need to remember passwords
2. **Instant**: Creates user on-the-fly
3. **Any Role**: Test any role instantly
4. **No Setup**: No database setup needed
5. **Perfect for Development**: Quick testing of different user types

---

## ⚠️ Important Notes

1. **Development Only**: Mock login is for testing, disable in production
2. **Real Tokens**: Mock login generates real JWT tokens
3. **Full Access**: Tokens work with all API endpoints
4. **SSL Certificate**: Accept certificate first by visiting `https://98.70.245.87`

---

## 🔄 Alternative: Regular Login (If Mock is Disabled)

If mock login is disabled, use these test credentials:

```javascript
fetch('https://98.70.245.87/api/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    emailOrEmployeeId: 'admin@test.com',
    password: 'Admin@123'
  })
})
```

**Test Credentials:**
- Admin: `admin@test.com` / `Admin@123`
- HR: `hr@test.com` / `HR@123`
- Employee: `employee@test.com` / `Employee@123`

---

## 📞 Need Help?

- **Full API Docs**: `DEPLOYED_SERVICES_AND_APIS.md`
- **Troubleshooting**: `FRONTEND_WORKING_SOLUTION.md`
- **Test Users**: `FRONTEND_TEST_USERS.md`

---

**Status**: ✅ Mock Login Active & Ready!  
**Last Updated**: December 30, 2025

