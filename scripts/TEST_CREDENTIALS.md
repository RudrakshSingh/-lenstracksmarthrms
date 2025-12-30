# Test User Credentials for Frontend Development

## 🔐 Test Login Credentials

Use these credentials to test the login functionality in your frontend application.

---

## Available Test Users

### 1. Admin User
```
Email/Employee ID: admin@test.com or EMP001
Password: Admin@123
Role: Admin
Access: Full system access
```

**Login Example:**
```javascript
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
```

---

### 2. HR User
```
Email/Employee ID: hr@test.com or EMP002
Password: HR@123
Role: HR
Access: HR management, employee data, leave management
```

**Login Example:**
```javascript
fetch('https://98.70.245.87/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    emailOrEmployeeId: 'hr@test.com',
    password: 'HR@123'
  })
})
```

---

### 3. Manager User
```
Email/Employee ID: manager@test.com or EMP004
Password: Manager@123
Role: Manager
Access: Team management, approve leave, attendance reports
```

**Login Example:**
```javascript
fetch('https://98.70.245.87/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    emailOrEmployeeId: 'manager@test.com',
    password: 'Manager@123'
  })
})
```

---

### 4. Employee User
```
Email/Employee ID: employee@test.com or EMP003
Password: Employee@123
Role: Employee
Access: Self-service (profile, attendance, leave requests)
```

**Login Example:**
```javascript
fetch('https://98.70.245.87/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    emailOrEmployeeId: 'employee@test.com',
    password: 'Employee@123'
  })
})
```

---

## 📋 Quick Reference Table

| Role | Email | Employee ID | Password | Department |
|------|-------|-------------|----------|------------|
| **Admin** | admin@test.com | EMP001 | Admin@123 | IT |
| **HR** | hr@test.com | EMP002 | HR@123 | Human Resources |
| **Employee** | employee@test.com | EMP003 | Employee@123 | Sales |
| **Manager** | manager@test.com | EMP004 | Manager@123 | Operations |

---

## 🧪 Testing Login Flow

### Step 1: Login
```javascript
const loginResponse = await fetch('https://98.70.245.87/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    emailOrEmployeeId: 'admin@test.com',
    password: 'Admin@123'
  })
});

const loginData = await loginResponse.json();
console.log(loginData);
```

### Expected Response:
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
      "department": "IT"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Step 2: Use Access Token
```javascript
const { accessToken } = loginData.data;

// Get user profile
const profileResponse = await fetch('https://98.70.245.87/api/auth/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// Get employees (HR/Admin only)
const employeesResponse = await fetch('https://98.70.245.87/api/hr/employees', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

---

## 🔒 Login with Employee ID

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

## ⚠️ Important Notes

1. **These are TEST credentials** - Do not use in production
2. **Passwords are simple** for testing purposes only
3. **All users are pre-verified** and active
4. **Access Token expires** in 15 minutes (use refresh token to renew)
5. **Refresh Token expires** in 7 days

---

## 🔄 Password Reset Testing

If you need to test password reset:

```javascript
// Request password reset
fetch('https://98.70.245.87/api/auth/request-password-reset', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'admin@test.com'
  })
})
```

---

## 🛠️ Creating Additional Test Users

If you need more test users, use the register endpoint:

```javascript
fetch('https://98.70.245.87/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <admin-or-hr-token>'
  },
  body: JSON.stringify({
    employee_id: 'EMP005',
    name: 'New Test User',
    email: 'newuser@test.com',
    password: 'Test@123',
    role: 'employee',
    department: 'IT',
    designation: 'Developer',
    joining_date: '2024-01-01',
    phone: '+919999999999'
  })
})
```

---

## 🆘 Troubleshooting

### Issue: Login returns "Invalid credentials"
- ✅ Check you're using correct email/employee ID
- ✅ Check password is correct (case-sensitive)
- ✅ Ensure user is created in database

### Issue: "User not found"
- Run the `create-test-user.js` script to create users
- Or use the register endpoint with admin/HR credentials

### Issue: Token expired
- Use the refresh token endpoint:
```javascript
fetch('https://98.70.245.87/api/auth/refresh-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    refreshToken: '<your-refresh-token>'
  })
})
```

---

## 📞 Support

If you need additional test users or face any issues:
1. Check `FRONTEND_WORKING_SOLUTION.md`
2. Check `DEPLOYED_SERVICES_AND_APIS.md`
3. Contact DevOps team

---

**Last Updated**: December 30, 2025

