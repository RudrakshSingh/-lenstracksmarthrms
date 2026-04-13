# Backend Action Items - Frontend Integration Fixes

**Priority:** High  
**Target:** Fix all frontend integration issues  
**Base URL:** `https://api.etelios.com`

---

## 🔴 Critical Issues (Fix Immediately)

### 1. Check-in Endpoint - Employee Not Found (404)

**Issue:** `POST /api/attendance/check-in` returns 404 with message:
```
"Employee not found in HR service. Searched by: employee_id=EMP-2026-886706, user_id=69a97889bdf46351402d518b, email=rudi@gmail.com. Tenant: default."
```

**Action Required:**
1. ✅ Link user `69a97889bdf46351402d518b` (Rudi@gmail.com) to employee record in HR service
2. ✅ Assign employee to at least one store
3. ✅ Ensure tenant consistency (default or frontend tenant)
4. ✅ Return 200/201 with attendance record on success

**Test User:**
- Email: `Rudi@gmail.com`
- Password: `Rudi@3006`
- User ID: `69a97889bdf46351402d518b`
- Employee ID: `EMP-2026-886706`
- Tenant: `default`

---

### 2. Permission Issues - Employee Cannot View Own Data (403)

**Issue:** Employee role cannot view their own data (403 errors)

**Endpoints Affected:**
- `GET /api/attendance/stats?employeeId=<self>` → 403
- `GET /api/hr/performance/employee/<self>` → 403 (hr.performance.read)
- `GET /api/hr/leaves/applications?employeeId=<self>` → 403

**Action Required:**
1. ✅ Add "read-own" permission for employee role
2. ✅ Allow employees to view their own:
   - Attendance stats
   - Performance data
   - Leave applications
3. ✅ Update RBAC middleware to check if `employeeId` matches logged-in user

---

## 🟡 High Priority Issues

### 3. Missing Routes (404)

**Routes Frontend Expects:**
- `GET /api/tasks?employeeId=` → 404
- `GET /api/payroll/preview?employeeId=` → 404

**Action Required:**
1. ✅ Add routes or inform frontend of correct paths:
   - Tasks: `/api/hr/tasks` or `/api/tasks`
   - Payroll preview: `/api/hr/payroll/preview` or `/api/payroll/preview`

---

### 4. HR Service Check-in Routes (404)

**Issue:** 
- `POST /api/hr/attendance/check-in` → 404
- `POST /api/hr/attendance/check-out` → 404

**Action Required:**
1. ✅ If check-in handled by HR service: Add routes to HR service
2. ✅ If check-in handled by attendance service: Ensure routing works via gateway
3. ✅ Document correct endpoint for frontend

---

### 5. Leave Balance Endpoint (404)

**Issue:** `GET /api/hr/leaves/balance?employeeId=` → 404 (Employee not found)

**Action Required:**
1. ✅ Ensure employee lookup works correctly
2. ✅ Return leave balance even if 0
3. ✅ Handle employee not found gracefully

---

## ✅ Working Endpoints (No Action Needed)

- ✅ `POST /api/auth/login` - Working
- ✅ `GET /api/auth/status` - Working
- ✅ `GET /health` - Working
- ✅ `GET /api/hr/roster` - Working
- ✅ `GET /api/hr/roster?employeeId=&date=` - Working
- ✅ `GET /api/attendance?employeeId=&date=` - Working (returns 200)

---

## 🧪 Testing Commands

### Test Login
```bash
curl -s -X POST "https://api.etelios.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"emailOrEmployeeId":"Rudi@gmail.com","password":"Rudi@3006"}' | jq '.data.accessToken'
```

### Test Check-in (After Fix)
```bash
TOKEN="<ACCESS_TOKEN_FROM_LOGIN>"
curl -s -X POST "https://api.etelios.com/api/attendance/check-in" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"employeeId":"69a97889bdf46351402d518b","latitude":28.6139,"longitude":77.2090}' | jq '.'
```

### Test Attendance Stats (After Permission Fix)
```bash
TOKEN="<ACCESS_TOKEN_FROM_LOGIN>"
curl -s -X GET "https://api.etelios.com/api/attendance/stats?employeeId=69a97889bdf46351402d518b" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Test Performance (After Permission Fix)
```bash
TOKEN="<ACCESS_TOKEN_FROM_LOGIN>"
curl -s -X GET "https://api.etelios.com/api/hr/performance/employee/69a97889bdf46351402d518b" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Test Leave Applications (After Permission Fix)
```bash
TOKEN="<ACCESS_TOKEN_FROM_LOGIN>"
curl -s -X GET "https://api.etelios.com/api/hr/leaves/applications?employeeId=69a97889bdf46351402d518b" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

---

## 📋 Checklist for Backend Team

- [ ] Link user `69a97889bdf46351402d518b` to employee record
- [ ] Assign employee to store
- [ ] Fix check-in endpoint (200/201 response)
- [ ] Add read-own permissions for employee role
- [ ] Fix attendance stats permission (403 → 200)
- [ ] Fix performance permission (403 → 200)
- [ ] Fix leave applications permission (403 → 200)
- [ ] Add missing routes (tasks, payroll preview) or document correct paths
- [ ] Fix leave balance endpoint (404 → 200)
- [ ] Add HR service check-in/check-out routes or document routing
- [ ] Test all endpoints with employee role
- [ ] Update API documentation

---

## 📞 Contact

**Frontend Team:** After fixes, please update this document with:
- What was fixed
- Any path changes
- New endpoints added
- Permission changes

---

**Status:** Pending Backend Fixes  
**Last Updated:** March 2026
