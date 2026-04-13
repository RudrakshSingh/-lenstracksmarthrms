# Superadmin JWT Token Payload

## 📋 Superadmin Token Structure

When a superadmin user logs in, the JWT token contains the following payload:

### Custom Payload Fields

```json
{
  "userId": "69918dde41e0c3122f4df3dd",
  "role": "superadmin",
  "tenantId": "upcapto",
  "employee_id": "UPCAPTO-ADMIN-001"
}
```

### Full Decoded Token (with JWT Standard Fields)

```json
{
  "userId": "69918dde41e0c3122f4df3dd",
  "role": "superadmin",
  "tenantId": "upcapto",
  "employee_id": "UPCAPTO-ADMIN-001",
  "iat": 1771150915,
  "exp": 1771151815,
  "aud": "hrms-frontend",
  "iss": "hrms-backend"
}
```

---

## 🔑 Payload Fields Explained

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `userId` | string | MongoDB ObjectId of the user | `"69918dde41e0c3122f4df3dd"` |
| `role` | string | User role (always `"superadmin"` for superadmin) | `"superadmin"` |
| `tenantId` | string | Tenant ID (for Upcapto: `"upcapto"`) | `"upcapto"` |
| `employee_id` | string | Employee ID | `"UPCAPTO-ADMIN-001"` |
| `iat` | number | Issued at (Unix timestamp) | `1771150915` |
| `exp` | number | Expiration time (Unix timestamp) | `1771151815` |
| `aud` | string | Audience (always `"hrms-frontend"`) | `"hrms-frontend"` |
| `iss` | string | Issuer (always `"hrms-backend"`) | `"hrms-backend"` |

---

## 🔐 Superadmin Credentials

```
Email:    admin@upcapto.com
Password: Upcapto@2026
Tenant:   upcapto
Role:     superadmin
```

---

## 📝 Key Differences from Regular Admin

1. **Role**: `"superadmin"` instead of `"admin"`
2. **Tenant Access**: Superadmin can access all tenants (tenantId may be optional in some contexts)
3. **Permissions**: Superadmin has ALL permissions by default
4. **Tenant Validation**: Superadmin doesn't require tenantId validation in some endpoints

---

## 🧪 Example: Decode Superadmin Token

```javascript
// Decode token to see payload
const jwt = require('jsonwebtoken');

const token = 'YOUR_SUPERADMIN_TOKEN_HERE';
const decoded = jwt.decode(token);

console.log('Superadmin Payload:', decoded);
// Output:
// {
//   userId: "69918dde41e0c3122f4df3dd",
//   role: "superadmin",
//   tenantId: "upcapto",
//   employee_id: "UPCAPTO-ADMIN-001",
//   iat: 1771150915,
//   exp: 1771151815,
//   aud: "hrms-frontend",
//   iss: "hrms-backend"
// }
```

---

## ✅ Superadmin Capabilities

Based on the payload and role:

1. **All Permissions**: Superadmin has access to all features
2. **Multi-Tenant Access**: Can access and manage all tenants
3. **User Management**: Can create, update, delete any user
4. **Tenant Management**: Can create, update, delete tenants
5. **System Configuration**: Full system access

---

## 🔍 Token Validation

When validating a superadmin token:

```javascript
// Check if user is superadmin
if (decoded.role === 'superadmin' || decoded.role === 'super-admin') {
  // Superadmin has full access
  // tenantId may be optional for some operations
}
```

---

## 📋 Summary

**Superadmin Token Payload:**
- ✅ `userId`: User's MongoDB ID
- ✅ `role`: `"superadmin"`
- ✅ `tenantId`: Tenant ID (e.g., `"upcapto"`)
- ✅ `employee_id`: Employee ID
- ✅ Standard JWT fields: `iat`, `exp`, `aud`, `iss`

**Token Expiry:** 15 minutes (default)
**Refresh Token Expiry:** 7 days (default)
