# ⚡ Frontend API Quick Reference - Working APIs

## 🔑 Essential Setup

```env
NEXT_PUBLIC_API_BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

## 📦 Required Headers (Every Request)

```typescript
headers: {
  'Authorization': `Bearer ${token}`,  // ⚠️ REQUIRED
  'x-tenant-id': tenantId,            // ⚠️ REQUIRED
  'Content-Type': 'application/json'         // ⚠️ REQUIRED for POST/PUT
}
```

---

## ✅ Working APIs (Tested & Verified)

### 🔐 Authentication

| API | Method | Endpoint | Status |
|-----|--------|----------|--------|
| Health Check | GET | `/api/auth/health` | ✅ 200 |
| Login | POST | `/api/auth/login` | ✅ 200 |
| Get Current User | GET | `/api/auth/me` | ✅ 200 |

### 👥 HR Management

| API | Method | Endpoint | Status |
|-----|--------|----------|--------|
| HR Health | GET | `/api/hr/health` | ✅ 200 |
| Get Employees | GET | `/api/hr/employees` | ✅ 200 |
| Create Employee | POST | `/api/hr/employees` | ✅ 201 |
| Get Departments | GET | `/api/hr/departments` | ✅ 200 |
| Get Stores | GET | `/api/hr/stores` | ✅ 200 |

### ⏰ Attendance

| API | Method | Endpoint | Status |
|-----|--------|----------|--------|
| Attendance Health | GET | `/api/attendance/health` | ✅ 200 |
| Clock In | POST | `/api/attendance/clock-in` | ✅ 201 |

---

## ⚠️ APIs with Issues

| API | Method | Endpoint | Issue | Workaround |
|-----|--------|----------|-------|------------|
| Get Attendance Records | GET | `/api/attendance` | ❌ 404 | Try `/api/attendance/records` |
| Get Attendance Summary | GET | `/api/attendance/summary` | ❌ 404 | Check route configuration |
| Payroll APIs | GET/POST | `/api/payroll/*` | ❌ 504 | Service restarting, retry later |
| Get Current Company | GET | `/api/tenant/company` | ❌ 404 | Check tenant service |

---

## 🚨 Critical Requirements

### Employee Creation - MUST Include:

```typescript
{
  employeeId: `EMP-${Date.now()}`,  // ⚠️ REQUIRED!
  firstName: "John",                // ⚠️ REQUIRED!
  email: "john@example.com",       // ⚠️ REQUIRED!
  department: "Sales"               // ⚠️ REQUIRED!
}
```

---

## 💻 Quick Code Examples

### Login
```typescript
const response = await apiClient.post('/api/auth/login', {
  email: 'Admin@lenstrack.com',
  password: 'Kadarkhan@123'
});
localStorage.setItem('accessToken', response.data.data.accessToken);
```

### Get Employees
```typescript
const response = await apiClient.get('/api/hr/employees?limit=10');
const employees = response.data.data;
```

### Create Employee
```typescript
const response = await apiClient.post('/api/hr/employees', {
  employeeId: `EMP-${Date.now()}`,  // ⚠️ REQUIRED!
  firstName: 'John',
  email: 'john@example.com',
  department: 'Sales'
});
```

### Clock In
```typescript
const response = await apiClient.post('/api/attendance/clock-in', {
  latitude: 28.6139,
  longitude: 77.2090,
  location: 'Delhi, India'
});
```

---

## 🔧 Common Errors & Fixes

| Error | Fix |
|-------|-----|
| "Employee ID is required" | Add `employeeId` to payload |
| 404 Not Found | Check endpoint URL (not localhost) |
| 401 Unauthorized | Add `Authorization` header |
| "Tenant not found" | Add `x-tenant-id` header |
| 504 Gateway Timeout | Retry after few seconds |

---

## 📚 Full Documentation

👉 **See `FRONTEND_API_COMPLETE_GUIDE.md` for:**
- Complete code examples
- Request/response formats
- Error handling
- Troubleshooting guide
- React component examples

---

**Last Updated:** 2026-02-16  
**Status:** ✅ Most APIs Working
