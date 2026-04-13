# Superadmin Login Payload - Frontend Developer Guide

## 🔐 Superadmin Credentials

```
Email:    admin@upcapto.com
Password: Upcapto@2026
Tenant:   upcapto
Role:     superadmin
```

---

## 📤 Request Payload

### Endpoint
```
POST /api/auth/login
```

### Headers
```
Content-Type: application/json
```

### Request Body
```json
{
  "email": "admin@upcapto.com",
  "password": "Upcapto@2026"
}
```

**Note:** `tenantId` is NOT required in login request body. It's extracted from the user record.

---

## 📥 Response Payload

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "69918dde41e0c3122f4df3dd",
      "tenantId": "upcapto",
      "employee_id": "UPCAPTO-ADMIN-001",
      "name": "Upcapto Super Admin",
      "email": "admin@upcapto.com",
      "phone": "+91-9876543210",
      "role": "superadmin",
      "department": "HR",
      "band_level": "A",
      "hierarchy_level": "NATIONAL",
      "designation": "Super Administrator",
      "status": "active",
      "is_active": true,
      "mustChangePassword": false,
      "passwordTemporary": false
    },
    "mustChangePassword": false,
    "passwordTemporary": false
  }
}
```

---

## 🔑 JWT Token Payload (Decoded)

### Access Token Payload
```json
{
  "userId": "69918dde41e0c3122f4df3dd",
  "email": "admin@upcapto.com",
  "role": "superadmin",
  "tenantId": "upcapto",
  "employee_id": "UPCAPTO-ADMIN-001",
  "iat": 1771151013,
  "exp": 1771151913,
  "aud": "hrms-frontend",
  "iss": "hrms-backend"
}
```

### Token Fields Explained

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `userId` | string | MongoDB ObjectId | `"69918dde41e0c3122f4df3dd"` |
| `email` | string | User email | `"admin@upcapto.com"` |
| `role` | string | User role | `"superadmin"` |
| `tenantId` | string | Tenant ID | `"upcapto"` |
| `employee_id` | string | Employee ID | `"UPCAPTO-ADMIN-001"` |
| `iat` | number | Issued at (Unix timestamp) | `1771151013` |
| `exp` | number | Expiration (Unix timestamp) | `1771151913` |
| `aud` | string | Audience | `"hrms-frontend"` |
| `iss` | string | Issuer | `"hrms-backend"` |

---

## 💻 Frontend Implementation

### JavaScript/React Example

```javascript
// Login function
const loginAsSuperadmin = async () => {
  try {
    const response = await fetch('http://API_URL/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@upcapto.com',
        password: 'Upcapto@2026'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Save token
      localStorage.setItem('authToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('tenantId', data.data.user.tenantId);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      
      // Decode token to get payload
      const tokenPayload = JSON.parse(atob(data.data.accessToken.split('.')[1]));
      console.log('Token Payload:', tokenPayload);
      
      return {
        success: true,
        token: data.data.accessToken,
        user: data.data.user,
        tokenPayload: tokenPayload
      };
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Login failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Usage
const result = await loginAsSuperadmin();
if (result.success) {
  console.log('Logged in as:', result.user.email);
  console.log('Role:', result.tokenPayload.role);
  console.log('Tenant:', result.tokenPayload.tenantId);
}
```

### TypeScript Example

```typescript
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      _id: string;
      email: string;
      role: string;
      tenantId: string;
      employee_id: string;
      name: string;
      // ... other fields
    };
  };
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  employee_id: string;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}

const loginAsSuperadmin = async (): Promise<LoginResponse> => {
  const response = await fetch('http://API_URL/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'admin@upcapto.com',
      password: 'Upcapto@2026'
    } as LoginRequest)
  });
  
  return await response.json();
};

// Decode token
const decodeToken = (token: string): TokenPayload => {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonPayload);
};
```

---

## 🔍 Token Payload Access

### Get Token Payload in Frontend

```javascript
// Method 1: Decode JWT token
const token = localStorage.getItem('authToken');
const payload = JSON.parse(atob(token.split('.')[1]));

console.log('User ID:', payload.userId);
console.log('Email:', payload.email);
console.log('Role:', payload.role);
console.log('Tenant:', payload.tenantId);

// Method 2: Use from login response
const loginData = await loginAsSuperadmin();
const tokenPayload = loginData.tokenPayload;

// Method 3: Use jwt-decode library
import jwtDecode from 'jwt-decode';
const decoded = jwtDecode(token);
```

---

## 📋 Complete Payload Structure

### Request Payload
```json
{
  "email": "admin@upcapto.com",
  "password": "Upcapto@2026"
}
```

### Response Payload
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "user": {
      "email": "admin@upcapto.com",
      "role": "superadmin",
      "tenantId": "upcapto",
      // ... full user object
    }
  }
}
```

### Token Payload (Decoded)
```json
{
  "userId": "69918dde41e0c3122f4df3dd",
  "email": "admin@upcapto.com",
  "role": "superadmin",
  "tenantId": "upcapto",
  "employee_id": "UPCAPTO-ADMIN-001",
  "iat": 1771151013,
  "exp": 1771151913,
  "aud": "hrms-frontend",
  "iss": "hrms-backend"
}
```

---

## ✅ Key Points for Frontend

1. **Login Request:**
   - Only needs `email` and `password`
   - No `tenantId` in request body

2. **Token Contains:**
   - `userId`: For user identification
   - `email`: User email
   - `role`: `"superadmin"`
   - `tenantId`: `"upcapto"`
   - `employee_id`: Employee ID

3. **Use Token For:**
   - All authenticated API requests
   - Include in `Authorization: Bearer <token>` header
   - Include `x-tenant-id: upcapto` header

4. **Token Expiry:**
   - Access Token: 15 minutes
   - Refresh Token: 7 days

---

## 🧪 Quick Test

```bash
# Login
curl -X POST http://API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@upcapto.com",
    "password": "Upcapto@2026"
  }'

# Decode token (get payload)
# Use jwt.io or decode in frontend
```

---

## 📝 Summary

**Request Payload:**
```json
{
  "email": "admin@upcapto.com",
  "password": "Upcapto@2026"
}
```

**Token Payload (in JWT):**
```json
{
  "userId": "...",
  "email": "admin@upcapto.com",
  "role": "superadmin",
  "tenantId": "upcapto",
  "employee_id": "UPCAPTO-ADMIN-001"
}
```

**All payload information ready for frontend!** ✅
