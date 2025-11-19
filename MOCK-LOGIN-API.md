# Mock Login API for Frontend Testing

## Overview
The mock login endpoint allows frontend developers to test the application without requiring real user credentials. It creates or finds a user with the specified role and returns valid JWT tokens.

## Endpoint

**POST** `/api/auth/mock-login`

## Request Body

```json
{
  "role": "hr",  // Optional: 'admin', 'hr', 'manager', 'employee', 'superadmin' (default: 'hr')
  "email": "custom@email.com",  // Optional: Custom email (default: mock.{role}@etelios.com)
  "employeeId": "CUSTOM001",  // Optional: Custom employee ID (default: MOCK{ROLE}001)
  "name": "Custom Name"  // Optional: Custom name (default: Mock {ROLE} User)
}
```

## Response

```json
{
  "success": true,
  "message": "Mock login successful",
  "data": {
    "user": {
      "_id": "user_id",
      "employee_id": "MOCKHR001",
      "name": "Mock HR User",
      "email": "mock.hr@etelios.com",
      "role": "hr",
      "department": "HR",
      "designation": "HR Manager"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "mock": true
}
```

## Usage Examples

### 1. Login as HR (Default)
```bash
curl -X POST https://your-api-gateway.com/api/auth/mock-login \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 2. Login as Admin
```bash
curl -X POST https://your-api-gateway.com/api/auth/mock-login \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

### 3. Login as Manager
```bash
curl -X POST https://your-api-gateway.com/api/auth/mock-login \
  -H "Content-Type: application/json" \
  -d '{"role": "manager"}'
```

### 4. Login as Employee
```bash
curl -X POST https://your-api-gateway.com/api/auth/mock-login \
  -H "Content-Type: application/json" \
  -d '{"role": "employee"}'
```

### 5. Custom User Details
```bash
curl -X POST https://your-api-gateway.com/api/auth/mock-login \
  -H "Content-Type: application/json" \
  -d '{
    "role": "hr",
    "email": "test.hr@etelios.com",
    "employeeId": "TESTHR001",
    "name": "Test HR User"
  }'
```

## Frontend Integration

### JavaScript/TypeScript Example

```javascript
// Mock login function
async function mockLogin(role = 'hr') {
  try {
    const response = await fetch('https://your-api-gateway.com/api/auth/mock-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role })
    });

    const data = await response.json();
    
    if (data.success) {
      // Store tokens
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      
      // Use the token for subsequent API calls
      return data.data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Mock login failed:', error);
    throw error;
  }
}

// Usage
mockLogin('hr').then(userData => {
  console.log('Logged in as:', userData.user);
  // Redirect to dashboard or update UI
});
```

### Using the Access Token

After mock login, use the `accessToken` in the Authorization header for all authenticated API calls:

```javascript
const accessToken = localStorage.getItem('accessToken');

fetch('https://your-api-gateway.com/api/hr/employees', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data));
```

## Available Roles

- **admin**: Full administrative access
- **hr**: HR management access
- **manager**: Manager-level access
- **employee**: Employee-level access
- **superadmin**: Super administrator access

## Features

1. **Automatic User Creation**: If a mock user doesn't exist, it will be created automatically
2. **User Reuse**: If a mock user already exists, it will be reused and updated
3. **Valid JWT Tokens**: Returns production-valid JWT tokens that work with all protected endpoints
4. **Role-Based Access**: Creates users with the specified role and appropriate permissions
5. **No Password Required**: No need to remember or manage passwords for testing

## Important Notes

⚠️ **This endpoint is for development/testing only.**
- Do not use in production
- Mock users are created with default credentials
- All mock users have the password: `mockpassword123` (if you need to use regular login)

## Testing HR and HRMS Access

### For HR Access:
```bash
POST /api/auth/mock-login
Body: {"role": "hr"}
```

### For HRMS Access (Admin):
```bash
POST /api/auth/mock-login
Body: {"role": "admin"}
```

Both will return valid tokens that can access:
- `/api/hr/*` endpoints
- `/api/auth/*` endpoints
- All other protected endpoints based on role permissions

## Error Responses

### Invalid Role
```json
{
  "success": false,
  "message": "Invalid role. Must be one of: admin, hr, manager, employee, superadmin"
}
```

### Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details"
}
```

