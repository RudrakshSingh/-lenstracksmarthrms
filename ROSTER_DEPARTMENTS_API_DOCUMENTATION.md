# 📋 ROSTER & DEPARTMENTS API - PRODUCTION DOCUMENTATION

**Last Updated:** January 13, 2026  
**API Base URL:** `https://api.etelios.com`  
**Environment:** Production  
**Status:** ✅ Operational

---

## 🔐 AUTHENTICATION

All endpoints require authentication via Bearer token.

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@etelios.com",
  "password": "Admin@123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Use the `accessToken` in all subsequent requests:**
```
Authorization: Bearer <accessToken>
```

---

## 🏢 DEPARTMENTS API

### ✅ 1. Get All Departments

**Endpoint:** `GET /api/hr/departments`  
**Status:** ✅ WORKING  
**Authentication:** Required

**Request:**
```bash
curl -X GET "https://api.etelios.com/api/hr/departments" \
  -H "Authorization: Bearer <token>"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "dept-1",
      "name": "Sales",
      "code": "SALES",
      "description": "Sales Department"
    },
    {
      "id": "dept-2",
      "name": "IT",
      "code": "TECH",
      "description": "Technology Department"
    },
    {
      "id": "dept-3",
      "name": "HR",
      "code": "HR",
      "description": "Human Resources"
    },
    {
      "id": "dept-4",
      "name": "Accounts",
      "code": "ACCOUNTS",
      "description": "Accounts Department"
    },
    {
      "id": "dept-5",
      "name": "Operations",
      "code": "ECOMMERCE",
      "description": "Operations"
    },
    {
      "id": "dept-6",
      "name": "Lab",
      "code": "LAB",
      "description": "Laboratory"
    },
    {
      "id": "dept-7",
      "name": "Delivery",
      "code": "DELIVERY",
      "description": "Delivery Department"
    },
    {
      "id": "dept-8",
      "name": "Franchise",
      "code": "FRANCHISE",
      "description": "Franchise Department"
    }
  ],
  "message": "Departments retrieved successfully"
}
```

**Available Departments:**
| Code | Name | Description |
|------|------|-------------|
| `SALES` | Sales | Sales Department |
| `TECH` | IT | Technology Department |
| `HR` | HR | Human Resources |
| `ACCOUNTS` | Accounts | Accounts Department |
| `ECOMMERCE` | Operations | Operations |
| `LAB` | Lab | Laboratory |
| `DELIVERY` | Delivery | Delivery Department |
| `FRANCHISE` | Franchise | Franchise Department |

---

## 📅 ROSTER API

### ✅ 1. Get All Rosters

**Endpoint:** `GET /api/hr/roster`  
**Status:** ✅ FIXED (was 500, now working)  
**Authentication:** Required  
**Note:** Endpoint uses **singular** `/roster`, not `/rosters`

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `employeeId` | string | Filter by employee ID | `EMP-2026-001` |
| `storeId` | string | Filter by store code | `STORE-001` |
| `startDate` | date | Start date range | `2026-01-01` |
| `endDate` | date | End date range | `2026-01-31` |
| `status` | string | Filter by status | `active`, `draft`, `published` |
| `shift` | string | Filter by shift | `morning`, `afternoon`, `evening`, `night` |
| `page` | number | Page number | `1` |
| `limit` | number | Items per page | `50` |

**Request:**
```bash
curl -X GET "https://api.etelios.com/api/hr/roster?page=1&limit=50" \
  -H "Authorization: Bearer <token>"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "rosters": [
      {
        "_id": "roster-id-1",
        "employeeId": "EMP-2026-001",
        "employee": {
          "firstName": "John",
          "lastName": "Doe",
          "email": "john.doe@example.com",
          "phone": "+919876543210",
          "employeeId": "EMP-2026-001"
        },
        "storeId": "STORE-001",
        "store": {
          "name": "Main Store",
          "code": "STORE-001",
          "address": {
            "street": "123 Main St",
            "city": "Mumbai",
            "state": "Maharashtra"
          }
        },
        "date": "2026-01-15T00:00:00.000Z",
        "shift": "morning",
        "shiftStart": "09:00",
        "shiftEnd": "17:00",
        "breakDuration": 30,
        "status": "published",
        "notes": ""
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 50,
    "totalPages": 2
  }
}
```

### ✅ 2. Create Roster Entry

**Endpoint:** `POST /api/hr/roster`  
**Authentication:** Required (Admin/Manager)

**Request Body:**
```json
{
  "employeeId": "EMP-2026-001",
  "storeId": "STORE-001",
  "date": "2026-01-15",
  "shift": "morning",
  "shiftStart": "09:00",
  "shiftEnd": "17:00",
  "breakDuration": 30,
  "notes": "Regular shift"
}
```

**Shift Types:**
- `morning` - Morning shift
- `afternoon` - Afternoon shift
- `evening` - Evening shift
- `night` - Night shift

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "roster": {
      "_id": "roster-id-new",
      "employeeId": "EMP-2026-001",
      "storeId": "STORE-001",
      "date": "2026-01-15T00:00:00.000Z",
      "shift": "morning",
      "shiftStart": "09:00",
      "shiftEnd": "17:00",
      "breakDuration": 30,
      "status": "draft",
      "createdAt": "2026-01-13T11:00:00.000Z"
    }
  },
  "message": "Roster entry created successfully"
}
```

### ✅ 3. Get Roster Templates

**Endpoint:** `GET /api/hr/roster/templates`  
**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "template-1",
        "name": "Standard 8-Hour Shift",
        "shift": "morning",
        "shiftStart": "09:00",
        "shiftEnd": "17:00",
        "breakDuration": 30
      },
      {
        "id": "template-2",
        "name": "Evening Shift",
        "shift": "evening",
        "shiftStart": "14:00",
        "shiftEnd": "22:00",
        "breakDuration": 30
      }
    ]
  }
}
```

### ✅ 4. Generate AI Roster

**Endpoint:** `POST /api/hr/roster/generate`  
**Authentication:** Required (Admin/Manager)

**Request Body:**
```json
{
  "storeId": "STORE-001",
  "startDate": "2026-01-15",
  "endDate": "2026-01-21",
  "considerPerformance": true,
  "considerAttendance": true,
  "considerSkills": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "generated": 35,
    "rosters": [...]
  },
  "message": "AI roster generated successfully"
}
```

### ✅ 5. Update Roster Entry

**Endpoint:** `PUT /api/hr/roster/:id`  
**Authentication:** Required (Admin/Manager)

**Request Body:**
```json
{
  "shift": "afternoon",
  "shiftStart": "13:00",
  "shiftEnd": "21:00",
  "notes": "Shift changed due to store requirements"
}
```

### ✅ 6. Delete Roster Entry

**Endpoint:** `DELETE /api/hr/roster/:id`  
**Authentication:** Required (Admin/Manager)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Roster entry deleted successfully"
}
```

### ✅ 7. Publish Roster

**Endpoint:** `POST /api/hr/roster/:id/publish`  
**Authentication:** Required (Admin/Manager)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "roster": {
      "_id": "roster-id",
      "status": "published",
      "publishedAt": "2026-01-13T11:00:00.000Z"
    }
  },
  "message": "Roster published successfully"
}
```

### ✅ 8. Get Employee's Roster

**Endpoint:** `GET /api/hr/roster/my-roster`  
**Authentication:** Required (Employee)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | date | Start date |
| `endDate` | date | End date |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "rosters": [
      {
        "date": "2026-01-15T00:00:00.000Z",
        "shift": "morning",
        "shiftStart": "09:00",
        "shiftEnd": "17:00",
        "store": {
          "name": "Main Store",
          "address": {...}
        }
      }
    ]
  }
}
```

---

## 🔧 AZURE COSMOS DB INDEX CONFIGURATION (BACKUP)

### For Azure Cosmos DB (MongoDB API)

If you need to create composite indexes manually:

**Azure Portal:**
1. Go to Azure Cosmos DB account
2. Select `hr-db` database
3. Select `rosters` collection
4. Click "Indexing Policy"
5. Add composite index

**Index Definition (JSON):**
```json
{
  "compositeIndexes": [
    [
      {
        "path": "/date",
        "order": "ascending"
      },
      {
        "path": "/shiftStart",
        "order": "ascending"
      }
    ],
    [
      {
        "path": "/tenantId",
        "order": "ascending"
      },
      {
        "path": "/date",
        "order": "ascending"
      }
    ],
    [
      {
        "path": "/employeeId",
        "order": "ascending"
      },
      {
        "path": "/date",
        "order": "ascending"
      }
    ]
  ]
}
```

**Azure CLI:**
```bash
az cosmosdb mongodb collection update \
  --resource-group etelios-rg \
  --account-name etelios-cosmos \
  --database-name hr-db \
  --name rosters \
  --idx '[
    {
      "key": {"keys": ["date", "shiftStart"]},
      "options": {"name": "date_shiftStart_idx"}
    },
    {
      "key": {"keys": ["tenantId", "date"]},
      "options": {"name": "tenant_date_idx"}
    }
  ]'
```

**Note:** The code has been fixed to avoid needing composite indexes, but this is provided as a performance optimization option.

---

## 🧪 TESTING EXAMPLES

### Using cURL

**1. Login and Get Token:**
```bash
TOKEN=$(curl -sk -X POST "https://api.etelios.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@etelios.com","password":"Admin@123456"}' \
  | jq -r '.data.accessToken')

echo $TOKEN
```

**2. Get Departments:**
```bash
curl -sk "https://api.etelios.com/api/hr/departments" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**3. Get Rosters:**
```bash
curl -sk "https://api.etelios.com/api/hr/roster?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**4. Create Roster:**
```bash
curl -sk -X POST "https://api.etelios.com/api/hr/roster" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMP-2026-001",
    "storeId": "STORE-001",
    "date": "2026-01-15",
    "shift": "morning",
    "shiftStart": "09:00",
    "shiftEnd": "17:00"
  }' | jq '.'
```

### Using JavaScript/Fetch

```javascript
// Login
const loginResponse = await fetch('https://api.etelios.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@etelios.com',
    password: 'Admin@123456'
  })
});

const { data } = await loginResponse.json();
const token = data.accessToken;

// Get Departments
const deptResponse = await fetch('https://api.etelios.com/api/hr/departments', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const departments = await deptResponse.json();
console.log(departments);

// Get Rosters
const rosterResponse = await fetch('https://api.etelios.com/api/hr/roster?page=1&limit=50', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const rosters = await rosterResponse.json();
console.log(rosters);
```

### Using Axios

```javascript
import axios from 'axios';

const API_BASE = 'https://api.etelios.com';

// Login
const { data: loginData } = await axios.post(`${API_BASE}/api/auth/login`, {
  email: 'admin@etelios.com',
  password: 'Admin@123456'
});

const token = loginData.data.accessToken;

// Create axios instance with token
const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Authorization': `Bearer ${token}` }
});

// Get Departments
const { data: departments } = await api.get('/api/hr/departments');

// Get Rosters
const { data: rosters } = await api.get('/api/hr/roster', {
  params: { page: 1, limit: 50 }
});

// Create Roster
const { data: newRoster } = await api.post('/api/hr/roster', {
  employeeId: 'EMP-2026-001',
  storeId: 'STORE-001',
  date: '2026-01-15',
  shift: 'morning',
  shiftStart: '09:00',
  shiftEnd: '17:00'
});
```

---

## ⚠️ COMMON ISSUES & SOLUTIONS

### Issue 1: 401 Unauthorized
**Cause:** Missing or invalid token  
**Solution:** Ensure you're including the `Authorization: Bearer <token>` header

### Issue 2: 404 on `/api/hr/rosters`
**Cause:** Wrong endpoint (plural)  
**Solution:** Use `/api/hr/roster` (singular)

### Issue 3: 500 on Roster GET
**Cause:** Database composite index missing (fixed in code)  
**Solution:** Code updated to use simple sorting. If still occurs, create composite indexes (see section above)

### Issue 4: Token Expired
**Cause:** Access token has 15-minute expiry  
**Solution:** Use refresh token to get new access token:
```bash
curl -X POST "https://api.etelios.com/api/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<your-refresh-token>"}'
```

---

## 📊 STATUS SUMMARY

| Feature | Endpoint | Status | Notes |
|---------|----------|--------|-------|
| **Departments** | `/api/hr/departments` | ✅ WORKING | Returns 8 departments |
| **Get Rosters** | `/api/hr/roster` | ✅ FIXED | Query optimized |
| **Create Roster** | `/api/hr/roster` | ✅ WORKING | Admin/Manager only |
| **Roster Templates** | `/api/hr/roster/templates` | ✅ WORKING | Predefined templates |
| **AI Generation** | `/api/hr/roster/generate` | ✅ WORKING | Uses ML algorithms |
| **Update Roster** | `/api/hr/roster/:id` | ✅ WORKING | Admin/Manager only |
| **Delete Roster** | `/api/hr/roster/:id` | ✅ WORKING | Admin/Manager only |
| **My Roster** | `/api/hr/roster/my-roster` | ✅ WORKING | Employee access |

---

## 🔗 RELATED DOCUMENTATION

- [Main API Documentation](./FRONTEND_DEPARTMENT_API_GUIDE.md)
- [Store Management](./FRONTEND_STORE_API_DOCUMENTATION.md)
- [Attendance System](./ATTENDANCE_SELFIE_GUIDE.md)

---

## 📞 SUPPORT

For issues or questions:
- Check logs: `kubectl logs -n etelios-backend-prod <pod-name>`
- API Health: `GET https://api.etelios.com/api/hr/health`
- Service Status: `GET https://api.etelios.com/api/hr/status`

---

**✅ Both Departments and Rosters are now fully operational!**

