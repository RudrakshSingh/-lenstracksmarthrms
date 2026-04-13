# Yesterday's Attendance Records Check

**Date:** 2026-03-05 (Yesterday)  
**Tenant:** lenstrack

---

## 🚀 Quick Test Commands

### Step 1: Login and Get Token
```bash
curl -X POST "http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@lenstrack.com",
    "password": "AdminPass123!"
  }'
```

**Save the `accessToken` from response**

### Step 2: Get Attendance Stats for Yesterday
```bash
curl -X GET "http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api/attendance/stats?date=2026-03-05" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "X-Tenant-Id: lenstrack"
```

### Step 3: Get Actual Attendance Records for Yesterday
```bash
curl -X GET "http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api/attendance?date=2026-03-05" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "X-Tenant-Id: lenstrack"
```

---

## 📝 Expected Response Format

### Stats Response:
```json
{
  "success": true,
  "data": {
    "totalEmployees": 7,
    "presentToday": <number>,
    "absentToday": <number>,
    "lateArrivals": <number>,
    "onLeave": 0,
    "attendanceRate": <percentage>,
    "averageHours": <hours>
  },
  "message": "Attendance statistics retrieved successfully"
}
```

### Records Response:
```json
{
  "success": true,
  "data": [
    {
      "employeeName": "...",
      "employee_id": "EMP-...",
      "status": "present",
      "check_in_time": "...",
      "check_out_time": "...",
      "total_hours": <number>,
      "is_late": false,
      "store_code": "..."
    }
  ],
  "pagination": { ... }
}
```

---

## 🔍 What to Check

1. **Total Employees** - Should be 7 for lenstrack tenant
2. **Present Today** - Number of employees who clocked in yesterday
3. **Absent Today** - Total - Present
4. **Records Array** - Actual attendance records with employee details

---

## ⚠️ If No Records Found

If you see:
- `presentToday: 0`
- `absentToday: 7` (all absent)
- Empty records array

**This means:** No one clocked in yesterday (2026-03-05)

**To verify:**
- Check if employees actually clocked in yesterday
- Check database directly
- Try a different date that had attendance

---

## 🧪 Alternative: Use Node Script

If curl doesn't work, use the Node script:

```bash
node scripts/fetch-attendance-stats.js
```

This script automatically:
1. Logs in
2. Gets yesterday's date
3. Fetches stats
4. Fetches actual records
5. Shows employee-wise details
