# Admin Login Credentials

**Date**: 2026-01-02  
**Status**: ✅ **Active**

---

## 🔐 Login Credentials

### Email
```
admin@etelios.com
```

### Password
```
Admin@123456
```

### Employee ID
```
ADMIN-001
```

### Role
```
admin
```

---

## 🌐 Login Endpoint

### URL
```
https://98.70.245.87/api/auth/login
```

### Request
```bash
POST /api/auth/login
Host: api.etelios.com
Content-Type: application/json

{
  "email": "admin@etelios.com",
  "password": "Admin@123456"
}
```

### cURL Example
```bash
curl -k -X POST "https://98.70.245.87/api/auth/login" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@etelios.com",
    "password": "Admin@123456"
  }'
```

---

## 🔑 Bearer Token

### Production Token
The production bearer token is saved in:
```
scripts/production-admin-token.json
```

### Get Fresh Token
To get a fresh production token, use the login API or mock-login-fast:

```bash
# Option 1: Real Login
curl -k -X POST "https://98.70.245.87/api/auth/login" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@etelios.com",
    "password": "Admin@123456"
  }'

# Option 2: Mock Login (Fast)
curl -k -X POST "https://98.70.245.87/api/auth/mock-login-fast" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

---

## ✅ User Status

- **Database**: `auth-db` (Production Cosmos DB)
- **User ID**: `6957c445d7b5d8cd373801b6`
- **Status**: `active`
- **Created**: 2026-01-02
- **Last Updated**: 2026-01-02

---

## 🧪 Test Login

### Using cURL
```bash
curl -k -X POST "https://98.70.245.87/api/auth/login" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@etelios.com",
    "password": "Admin@123456"
  }'
```

### Expected Response
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "6957c445d7b5d8cd373801b6",
      "email": "admin@etelios.com",
      "employee_id": "ADMIN-001",
      "name": "System Administrator",
      "role": "admin"
    }
  }
}
```

---

## 💡 Using the Token

### API Request Headers
```bash
Authorization: Bearer <TOKEN>
Host: api.etelios.com
Content-Type: application/json
```

### Example API Calls

#### Get Employees
```bash
curl -k -X GET "https://98.70.245.87/api/hr/employees" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <TOKEN>"
```

#### Create Employee
```bash
curl -k -X POST "https://98.70.245.87/api/hr/employees" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMP-123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "Password123",
    "roleName": "employee",
    "department": "SALES"
  }'
```

---

## ⚠️ Important Notes

1. **Security**: Keep credentials secure
2. **Token Expiry**: Access tokens expire in 15 minutes (default)
3. **Refresh Token**: Use refresh token to get new access token
4. **Production**: These credentials are for production environment
5. **Database**: User is stored in `auth-db` database

---

## 📁 Related Files

- `scripts/production-admin-token.json` - Production bearer token
- `scripts/admin-token.json` - Local bearer token (may not work on production)
- `scripts/get-production-token.js` - Script to get production token
- `ADMIN_LOGIN_CREDENTIALS.md` - This file

---

**Status**: ✅ **Active and Working**

