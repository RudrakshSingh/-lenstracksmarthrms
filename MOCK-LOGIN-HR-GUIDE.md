# Mock Login for HR Dashboard

## Overview

A mock login endpoint has been created to allow HR users to quickly login to the dashboard without requiring real credentials. This is useful for development and testing.

## Endpoint

**POST** `/api/auth/mock-login`

## Usage

### Basic Mock Login (Default HR User)

```bash
curl -X POST http://localhost:3002/api/auth/mock-login \
  -H "Content-Type: application/json" \
  -d '{}'
```

This will create/find an HR user with email `hr@company.com` and return login tokens.

### Custom Email Mock Login

```bash
curl -X POST http://localhost:3002/api/auth/mock-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hr.manager@company.com"
  }'
```

### Custom Role Mock Login

```bash
curl -X POST http://localhost:3002/api/auth/mock-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "role": "admin"
  }'
```

## Request Body

```json
{
  "email": "hr@company.com",  // Optional, defaults to "hr@company.com"
  "role": "hr"                // Optional, defaults to "hr". Options: "hr", "admin", "manager", "employee"
}
```

## Response

```json
{
  "user": {
    "id": "user-id",
    "email": "hr@company.com",
    "name": "HR Manager",
    "role": "hr",
    "permissions": [
      "hr.read",
      "hr.create",
      "hr.update",
      "hr.delete",
      "employee.read",
      "employee.create",
      "employee.update",
      "employee.delete",
      "dashboard.read"
    ],
    "tenantId": null,
    "employeeId": "HR123456"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400,
  "mockLogin": true
}
```

## Features

- **Auto-creates user**: If the HR user doesn't exist, it will be created automatically
- **Auto-creates role**: If the HR role doesn't exist, it will be created with appropriate permissions
- **24-hour token**: Access token expires in 24 hours (longer than regular login for convenience)
- **Full HR permissions**: User gets all HR-related permissions
- **Same response format**: Returns the same format as regular login, so frontend can use it directly

## Security

- **Production Protection**: Mock login is disabled in production unless `MOCK_LOGIN_ENABLED=true` is set
- **Development Only**: By default, only works in development mode
- **No Password Required**: Bypasses password verification (as intended for mock login)

## Environment Variables

```env
# Enable mock login in production (optional, not recommended)
MOCK_LOGIN_ENABLED=true

# Development mode (mock login enabled by default)
NODE_ENV=development
```

## Frontend Integration

You can use this endpoint in your frontend login form:

```javascript
// Mock login function
const mockLogin = async () => {
  try {
    const response = await fetch('http://localhost:3002/api/auth/mock-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'hr@company.com',
        role: 'hr'
      })
    });

    const data = await response.json();
    
    // Store tokens
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    
    // Redirect to dashboard
    window.location.href = '/dashboard/hr-head';
  } catch (error) {
    console.error('Mock login failed:', error);
  }
};
```

## Default HR User

If no email is provided, the system will use:
- **Email**: `hr@company.com`
- **Name**: HR Manager
- **Role**: hr
- **Employee ID**: Auto-generated (e.g., HR123456)

## Testing

### Test with curl

```bash
# Basic mock login
curl -X POST http://localhost:3002/api/auth/mock-login \
  -H "Content-Type: application/json" \
  -d '{}' | jq

# With custom email
curl -X POST http://localhost:3002/api/auth/mock-login \
  -H "Content-Type: application/json" \
  -d '{"email": "hr.manager@company.com"}' | jq
```

### Test with Postman

1. Create a new POST request
2. URL: `http://localhost:3002/api/auth/mock-login`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
   ```json
   {
     "email": "hr@company.com",
     "role": "hr"
   }
   ```

## Notes

- The mock login creates a real user in the database (if it doesn't exist)
- The user will have a default password (`password123`) but it's not needed for mock login
- All subsequent logins with the same email will use the existing user
- The user will be automatically set to active status
- Role will be created if it doesn't exist with appropriate permissions

