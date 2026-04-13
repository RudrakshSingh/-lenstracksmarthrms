# ⚡ Frontend Quick Reference Card

## 🔑 Essential Configuration

```env
NEXT_PUBLIC_API_BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

## 📦 Required Headers

```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'x-tenant-id': tenantId || 'upcapto',
  'Content-Type': 'application/json'
}
```

## ⚠️ Critical: Employee Creation

**Backend REQUIRES `employeeId`!**

```typescript
const payload = {
  employeeId: `EMP-${Date.now()}`,  // ⚠️ REQUIRED!
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',  // ⚠️ REQUIRED!
  department: 'Sales',  // ⚠️ REQUIRED!
};
```

## 🚨 Common Errors

| Error | Fix |
|-------|-----|
| "Employee ID is required" | Add `employeeId` to payload |
| 404 Not Found | Use production URL, not localhost |
| 401 Unauthorized | Add `Authorization` header |
| "Tenant not found" | Add `x-tenant-id` header |
| CORS Error | Use production URL |

## 📡 Key Endpoints

```
POST /api/auth/login
POST /api/hr/employees  ⚠️ Requires employeeId
GET  /api/hr/employees
POST /api/attendance/clock-in
GET  /api/attendance
```

## 🔍 Debug Steps

1. Open DevTools → Network tab
2. Check request URL (should be production, not localhost)
3. Check headers (Authorization, x-tenant-id)
4. Check payload (must have employeeId for creation)
5. Check response status (201/200 = success)

---

**See `FRONTEND_DEVELOPER_GUIDE.md` for complete documentation.**
