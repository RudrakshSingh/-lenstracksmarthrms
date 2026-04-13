# Frontend: Get Company/Tenant Info Endpoint

## ✅ Working Endpoint

**Endpoint:** `GET /api/tenants/company`

**Note:** Use `/api/tenants/company` (plural) instead of `/api/tenant/company` (singular) because the ingress routes `/api/tenants` to the tenant-registry-service.

---

## 📤 Request

```javascript
GET /api/tenants/company
Headers:
  Authorization: Bearer <your_jwt_token>
  Content-Type: application/json
```

**No request body needed** - tenantId is extracted from JWT token.

---

## 📥 Response

### Success (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "69918dde41e0c3122f4df3dd",
    "tenantId": "upcapto",
    "name": "Upcapto",
    "domain": "upcapto.com",
    "email": "admin@upcapto.com",
    "phone": "+91-9876543210",
    "status": "active",
    "plan": "Basic",
    "address": null,
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "createdAt": "2026-02-15T09:11:58.720Z",
    "updatedAt": "2026-02-15T10:44:32.244Z"
  },
  "message": "Company retrieved successfully"
}
```

### Error (404 Not Found)
```json
{
  "success": false,
  "message": "Company not found",
  "error": "COMPANY_NOT_FOUND"
}
```

### Error (400 Bad Request)
```json
{
  "success": false,
  "message": "Tenant ID not found in token or headers",
  "error": "TENANT_ID_MISSING"
}
```

---

## 💻 Frontend Implementation

### React/Next.js Example

```typescript
// Get company info
const getCompanyInfo = async (token: string) => {
  try {
    const response = await fetch(
      'http://API_URL/api/tenants/company',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      return data.data; // Company info
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Failed to get company info:', error);
    throw error;
  }
};

// Usage in component
useEffect(() => {
  const token = localStorage.getItem('authToken');
  if (token) {
    getCompanyInfo(token)
      .then(company => {
        console.log('Company:', company.name);
        setCompanyName(company.name);
      })
      .catch(error => {
        console.error('Error:', error);
      });
  }
}, []);
```

### Axios Example

```javascript
import axios from 'axios';

const getCompanyInfo = async () => {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await axios.get(
      'http://API_URL/api/tenants/company',
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return response.data.data; // Company info
  } catch (error) {
    console.error('Failed to get company info:', error.response?.data);
    throw error;
  }
};
```

---

## 🔑 Key Points

1. **Endpoint:** `/api/tenants/company` (plural, not singular)
2. **Authentication:** Required - JWT token in Authorization header
3. **Tenant ID:** Automatically extracted from JWT token
4. **No Parameters:** No need to pass tenantId - it's in the token

---

## 🧪 Quick Test

```bash
# 1. Login to get token
TOKEN=$(curl -s -X POST http://API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@upcapto.com","password":"Upcapto@2026"}' \
  | jq -r '.data.accessToken')

# 2. Get company info
curl -X GET http://API_URL/api/tenants/company \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

---

## ✅ Summary

**Use:** `GET /api/tenants/company`  
**Headers:** `Authorization: Bearer <token>`  
**Response:** Company/tenant information from JWT token's tenantId

**Fixed!** ✅
