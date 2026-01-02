# Backend URL Guide - Live Production

## 🌐 Base URL

```
https://98.70.245.87
```

---

## ⚠️ Important Notes

### Root URL Returns 404
- **`https://98.70.245.87/`** → **404 Not Found** ✅ (This is normal!)
- **`https://98.70.245.87/api`** → **404 Not Found** ✅ (This is normal!)

**Why?** The backend doesn't have a root endpoint. All APIs are under service-specific paths.

### Working Endpoints
All APIs must include the service path:
- ✅ `https://98.70.245.87/api/hr/*` - HR Service
- ✅ `https://98.70.245.87/api/auth/*` - Auth Service
- ✅ `https://98.70.245.87/api/attendance/*` - Attendance Service

---

## ✅ Working Endpoints

### Health Checks
- ✅ `GET https://98.70.245.87/api/hr/health` - Returns 200
- ✅ `GET https://98.70.245.87/api/hr/status` - Returns 200
- ✅ `GET https://98.70.245.87/api/auth/status` - Returns 200

### HR Service
- ✅ `GET https://98.70.245.87/api/hr/employees`
- ✅ `POST https://98.70.245.87/api/hr/employees`
- ✅ `GET https://98.70.245.87/api/hr/departments`
- ✅ `GET https://98.70.245.87/api/hr/stores`

### Auth Service
- ✅ `POST https://98.70.245.87/api/auth/mock-login`
- ✅ `GET https://98.70.245.87/api/auth/profile`

### Attendance Service
- ✅ `GET https://98.70.245.87/api/attendance/records`
- ✅ `GET https://98.70.245.87/api/attendance/stats`

---

## 📋 URL Structure

### Pattern
```
https://98.70.245.87/api/<service-name>/<endpoint>
```

### Examples
```
✅ https://98.70.245.87/api/hr/health
✅ https://98.70.245.87/api/hr/employees
✅ https://98.70.245.87/api/auth/mock-login
✅ https://98.70.245.87/api/attendance/records
```

### Don't Use
```
❌ https://98.70.245.87/              (404 - No root endpoint)
❌ https://98.70.245.87/api           (404 - No generic /api endpoint)
❌ https://98.70.245.87/hr/health     (404 - Missing /api prefix)
```

---

## 🔧 Headers (Optional but Recommended)

### For Proper Routing
```http
Host: api.etelios.com
```

### For Authenticated Requests
```http
Authorization: Bearer <token>
Content-Type: application/json
```

---

## 🧪 Quick Test

### Test Health Endpoint
```bash
curl -k https://98.70.245.87/api/hr/health
```

**Expected Response:**
```json
{
  "service": "hr-service",
  "status": "healthy",
  "timestamp": "...",
  "uptime": ...
}
```

### Test Auth Status
```bash
curl -k https://98.70.245.87/api/auth/status
```

---

## 📝 Summary

| URL | Status | Notes |
|-----|--------|-------|
| `https://98.70.245.87/` | ❌ 404 | No root endpoint (normal) |
| `https://98.70.245.87/api` | ❌ 404 | No generic API endpoint (normal) |
| `https://98.70.245.87/api/hr/health` | ✅ 200 | Working |
| `https://98.70.245.87/api/hr/employees` | ✅ 200 | Working (with auth) |
| `https://98.70.245.87/api/auth/status` | ✅ 200 | Working |

---

## 💡 Key Points

1. **Root URL (/) gives 404** - This is **normal** and **expected**
2. **All APIs are under `/api/<service>/*`** - Must include service name
3. **Health endpoints work** - Use these to verify connectivity
4. **Host header optional** - Works with or without it
5. **HTTPS required** - Use `https://` not `http://`

---

## 🎯 Correct Usage

### ✅ Correct
```javascript
const API_BASE_URL = 'https://98.70.245.87';

// Health check
fetch(`${API_BASE_URL}/api/hr/health`)

// Get employees
fetch(`${API_BASE_URL}/api/hr/employees`, {
  headers: {
    'Authorization': 'Bearer <token>'
  }
})
```

### ❌ Incorrect
```javascript
// Don't use root
fetch('https://98.70.245.87/')  // 404

// Don't use /api without service
fetch('https://98.70.245.87/api')  // 404

// Must include service name
fetch('https://98.70.245.87/hr/health')  // 404
```

---

**Last Updated**: 2026-01-01  
**Status**: ✅ Backend is working correctly - 404 on root is expected behavior

