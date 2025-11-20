# Mock Login Quick Test Guide

## ✅ Service Status

Based on the service status:
- **Auth Service**: ✅ Online
- **HR Service**: ✅ Online
- **Other Services**: ⚠️ Offline (not deployed yet)

## 🧪 Quick Test

### Test Mock Login Endpoint

```bash
curl -X POST "https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/api/auth/mock-login" \
  -H "Content-Type: application/json" \
  -d '{"role":"hr"}' \
  -k
```

### Expected Response

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
      "department": "HR"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "mock": true
}
```

## 📋 Available Roles

- `hr` - HR access
- `admin` - Admin access (full HRMS)
- `manager` - Manager access
- `employee` - Employee access
- `superadmin` - Super admin access

## 🔗 Live Endpoints

### Auth Service (Direct)
- **Base URL**: `https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net`
- **Mock Login**: `POST /api/auth/mock-login`
- **Profile**: `GET /api/auth/profile` (requires token)

### HR Service (Direct)
- **Base URL**: `https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net`
- **Employees**: `GET /api/hr/employees` (requires token)

### API Gateway
- **Base URL**: `https://etelios-app-service.azurewebsites.net`
- **Mock Login**: `POST /api/auth/mock-login`
- **All Services**: Check `/api` endpoint for full list

## 🚀 Frontend Usage

```javascript
// Simple mock login
const response = await fetch(
  'https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/api/auth/mock-login',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'hr' })
  }
);

const data = await response.json();

if (data.success) {
  // Store token
  localStorage.setItem('accessToken', data.data.accessToken);
  localStorage.setItem('user', JSON.stringify(data.data.user));
  
  // Use token for API calls
  const token = localStorage.getItem('accessToken');
  
  // Access HR endpoints
  const employees = await fetch(
    'https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net/api/hr/employees',
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
}
```

## ⚠️ Troubleshooting

### If you get 408 Timeout:
- The service might be creating the user in the database (first time)
- Wait 30-60 seconds and try again
- The user will be reused on subsequent calls

### If you get 404:
- Make sure the endpoint path is correct: `/api/auth/mock-login`
- Check if the service is deployed

### If you get 500:
- Check Azure App Service logs
- Verify database connection is working
- Check if MongoDB is accessible

## ✅ Test Results

Run the test script:
```bash
node test-mock-login-simple.js
```

This will:
1. Test mock login endpoint
2. Verify token generation
3. Test profile endpoint with token
4. Show you the complete response

