# Mock Login Credentials for HR

## Quick Mock Login (No Credentials Required)

The mock login endpoint **does not require actual credentials**. You just need to send a POST request with the role.

### Endpoint
```
POST https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/api/auth/mock-login
```

### Request Body
```json
{
  "role": "hr"
}
```

### cURL Example
```bash
curl -X POST "https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/api/auth/mock-login" \
  -H "Content-Type: application/json" \
  -d '{"role":"hr"}' \
  -k
```

### Fast Mock Login (Recommended - No Database)
```bash
curl -X POST "https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/api/auth/mock-login-fast" \
  -H "Content-Type: application/json" \
  -d '{"role":"hr"}' \
  -k
```

## Mock User Details (HR)

After successful mock login, you'll receive:

### User Profile
```json
{
  "_id": "mock_hr_MOCKHR001",
  "employee_id": "MOCKHR001",
  "name": "Mock HR User",
  "email": "mock.hr@etelios.com",
  "role": "hr",
  "department": "HR",
  "designation": "HR Manager"
}
```

### Mock User Credentials (For Reference)
- **Email:** `mock.hr@etelios.com`
- **Employee ID:** `MOCKHR001`
- **Name:** `Mock HR User`
- **Role:** `hr`
- **Department:** `HR`
- **Designation:** `HR Manager`
- **Password:** Not required (mock login bypasses password)

## Available Roles

You can use any of these roles:

| Role | Email | Employee ID | Department |
|------|-------|-------------|------------|
| `hr` | `mock.hr@etelios.com` | `MOCKHR001` | HR |
| `admin` | `mock.admin@etelios.com` | `MOCKADMIN001` | TECH |
| `manager` | `mock.manager@etelios.com` | `MOCKMANAGER001` | SALES |
| `employee` | `mock.employee@etelios.com` | `MOCKEMPLOYEE001` | SALES |
| `superadmin` | `mock.superadmin@etelios.com` | `MOCKSUPERADMIN001` | TECH |

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Mock login successful",
  "data": {
    "user": {
      "_id": "mock_hr_MOCKHR001",
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

## Using the Token

After getting the `accessToken`, use it in subsequent requests:

```bash
# Example: Get employees list
curl -X GET "https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net/api/hr/employees" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -k
```

## Frontend Integration

### JavaScript/React Example
```javascript
// Mock login function
async function mockLoginHR() {
  try {
    const response = await fetch(
      'https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/api/auth/mock-login-fast',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'hr' })
      }
    );

    const data = await response.json();
    
    if (data.success) {
      // Store token
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      
      console.log('Logged in as:', data.data.user);
      return data.data;
    }
  } catch (error) {
    console.error('Login error:', error);
  }
}

// Call the function
mockLoginHR();
```

### Using the Token in API Calls
```javascript
// Make authenticated API call
async function getEmployees() {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch(
    'https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net/api/hr/employees',
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  const data = await response.json();
  return data;
}
```

## Important Notes

1. **No Password Required**: Mock login doesn't require a password
2. **Fast Mode Recommended**: Use `mock-login-fast` to avoid database operations and timeouts
3. **Token Expiry**: Access tokens expire after a set time (check JWT config)
4. **Development Only**: Mock login is for development/testing only
5. **Production**: Use real login endpoint in production

## Troubleshooting

### If you get 408 Timeout
- Use `mock-login-fast` instead of `mock-login`
- This bypasses database operations

### If you get 404 Not Found
- Check the service URL is correct
- Ensure the service is deployed to Azure

### If token doesn't work
- Check token is being sent in Authorization header
- Verify token format: `Bearer YOUR_TOKEN`
- Check token hasn't expired

## Quick Test

Test the mock login right now:

```bash
# Fast mock login (recommended)
curl -X POST "https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/api/auth/mock-login-fast" \
  -H "Content-Type: application/json" \
  -d '{"role":"hr"}' \
  -k | jq
```

This will return the access token and user details immediately.


