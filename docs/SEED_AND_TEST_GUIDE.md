# 🌱 Complete System Seed & Test Guide

**Guide to seed database and test all APIs according to COMPLETE_SYSTEM_FLOW.md**

---

## 📋 Prerequisites

1. **Backend services running** (production or local)
2. **Database accessible** (DocumentDB or MongoDB)
3. **Node.js installed** (v14+)

---

## 🚀 Quick Start

### Option 1: Automated Seed & Test (Recommended)

```bash
# Run complete seed and test
./scripts/run-seed-and-test.sh

# Or with custom base URL
BASE_URL=http://localhost:3000 ./scripts/run-seed-and-test.sh
```

### Option 2: Manual Steps

```bash
# Step 1: Seed superadmin (if not exists)
node scripts/seed-superadmin-direct.js

# Step 2: Seed complete system
BASE_URL=<your-backend-url> node scripts/seed-complete-system.js

# Step 3: Test all APIs
BASE_URL=<your-backend-url> node scripts/test-complete-flow.js
```

---

## 📝 Step-by-Step Guide

### Step 1: Create Superadmin

**If superadmin doesn't exist, create it first:**

#### Method A: Direct Database (Recommended for first setup)

```bash
# Set MongoDB connection string
export MONGODB_URI="mongodb://user:password@host:27017/dbname"

# Run seed script
node scripts/seed-superadmin-direct.js
```

**Superadmin Credentials:**
- Email: `admin@upcapto.com`
- Password: `Upcapto@2026`
- Tenant: `upcapto`

#### Method B: Via API (if first user registration is enabled)

```bash
curl -X POST http://your-backend-url/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@upcapto.com",
    "password": "Upcapto@2026",
    "name": "Upcapto Super Admin",
    "employee_id": "UPCAPTO-ADMIN-001",
    "role": "superadmin",
    "tenantId": "upcapto",
    "department": "HR",
    "band_level": "A",
    "hierarchy_level": "NATIONAL",
    "designation": "Super Administrator"
  }'
```

### Step 2: Seed Complete System

**This creates:**
- ✅ Tenants (lenstrack, upcapto, eyekra)
- ✅ Tenant Admins (with temporary passwords)
- ✅ Stores (with geofencing coordinates)
- ✅ Departments
- ✅ Employees (with store and department assignments)

```bash
BASE_URL=http://your-backend-url node scripts/seed-complete-system.js
```

**Output:**
- `seed-credentials.json` - All login credentials

### Step 3: Test All APIs

**Tests complete flow:**
1. Superadmin Login
2. Create Tenant
3. Tenant Admin Login & Password Change
4. Create Store
5. Create Department
6. Create Employee
7. Employee Login
8. Employee Clock-In
9. Get Today's Attendance
10. Employee Clock-Out
11. Time Tracking
12. Dashboard APIs

```bash
BASE_URL=http://your-backend-url node scripts/test-complete-flow.js
```

**Output:**
- `test-results.json` - Detailed test results

---

## 📄 Generated Files

### `seed-credentials.json`

Contains all login credentials:

```json
{
  "superadmin": {
    "email": "admin@upcapto.com",
    "password": "Upcapto@2026",
    "tenantId": "upcapto"
  },
  "tenants": [
    {
      "name": "Lenstrack",
      "tenantId": "lenstrack",
      "adminEmail": "admin@lenstrack.com",
      "adminPassword": "TempPass123!@#",
      "employees": [
        {
          "employeeId": "EMP-2026-969954",
          "email": "john.doe@lenstrack.com",
          "password": "EmployeePass123!"
        }
      ]
    }
  ]
}
```

### `test-results.json`

Contains detailed test results:

```json
{
  "passed": 12,
  "failed": 0,
  "skipped": 0,
  "tests": [
    {
      "name": "1. Superadmin Login",
      "status": "PASS",
      "result": { ... }
    }
  ]
}
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Backend API URL
export BASE_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

# MongoDB Connection (for direct seeding)
export MONGODB_URI="mongodb://user:password@host:27017/dbname"
```

### Production URLs

```bash
# Production ALB
BASE_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

# Local Development
BASE_URL="http://localhost:3000"
```

---

## 🧪 Test Coverage

### ✅ Tested APIs

| # | API | Endpoint | Method |
|---|-----|----------|--------|
| 1 | Superadmin Login | `/api/auth/login` | POST |
| 2 | Create Tenant | `/api/tenants` | POST |
| 3 | Tenant Admin Login | `/api/auth/login` | POST |
| 4 | Change Password | `/api/auth/change-password` | PUT |
| 5 | Create Store | `/api/hr/stores` | POST |
| 6 | Create Department | `/api/hr/departments` | POST |
| 7 | Create Employee | `/api/hr/employees` | POST |
| 8 | Employee Login | `/api/auth/login` | POST |
| 9 | Clock-In | `/api/attendance/clock-in` | POST |
| 10 | Get Today Attendance | `/api/attendance/today` | GET |
| 11 | Clock-Out | `/api/attendance/check-out` | POST |
| 12 | Time Tracking | `/api/hr/time-tracking` | GET |
| 13 | Dashboard | `/api/hr/dashboard` | GET |

---

## 🐛 Troubleshooting

### Issue: Superadmin Login Fails

**Solution:**
1. Check if superadmin exists in database
2. Run `node scripts/seed-superadmin-direct.js` to create it
3. Verify credentials in `seed-credentials.json`

### Issue: Database Connection Timeout

**Solution:**
1. Check MongoDB/DocumentDB connection string
2. Verify network connectivity
3. Check security group rules (for DocumentDB)
4. Use API-based seeding instead

### Issue: Tenant Creation Fails

**Solution:**
1. Verify superadmin token is valid
2. Check if tenant already exists (409 error is OK)
3. Verify tenant data format

### Issue: Employee Creation Fails

**Solution:**
1. Ensure store and department exist first
2. Check employeeId uniqueness
3. Verify email uniqueness within tenant

---

## 📊 Expected Results

### Successful Seed Output

```
🚀 Starting Complete System Seed...
=====================================

✅ Logged in as superadmin: admin@upcapto.com
✅ Tenant created: Lenstrack
✅ Tenant created: Upcapto
✅ Tenant created: Eyekra
✅ Store created: Mumbai Store
✅ Department created: Sales
✅ Employee created: John Doe

📊 Seed Summary
=====================================

🏢 Tenant: Lenstrack (lenstrack)
   Stores: 2
   Departments: 3
   Employees: 2

✅ Complete System Seed Finished!
```

### Successful Test Output

```
🚀 Starting Complete Flow Tests
=====================================

✅ PASS: 1. Superadmin Login
✅ PASS: 2. Create Tenant
✅ PASS: 3. Tenant Admin Login
✅ PASS: 4. Create Store
✅ PASS: 5. Create Department
✅ PASS: 6. Create Employee
✅ PASS: 7. Employee Login
✅ PASS: 8. Employee Clock-In
✅ PASS: 9. Get Today's Attendance
✅ PASS: 10. Employee Clock-Out
✅ PASS: 11. Time Tracking
✅ PASS: 12. Dashboard APIs

📊 Test Summary
=====================================

✅ Passed: 12
❌ Failed: 0
⏭️  Skipped: 0

🎉 All tests passed!
```

---

## 🔐 Default Credentials

### Superadmin
- **Email:** `admin@upcapto.com`
- **Password:** `Upcapto@2026`
- **Tenant:** `upcapto`

### Tenant Admins (Auto-generated)
- **Email:** `admin@<tenant-domain>.com`
- **Password:** Temporary (auto-generated, shown in seed output)
- **Must Change:** Yes (on first login)

### Employees (Auto-generated)
- **Email:** `john.doe@lenstrack.com`, `jane.smith@lenstrack.com`
- **Password:** `EmployeePass123!`
- **Employee IDs:** `EMP-2026-969954`, `EMP-2026-969955`

---

## 📚 Related Documentation

- [Complete System Flow](./COMPLETE_SYSTEM_FLOW.md) - Detailed API flow
- [Frontend Developer Guide](./FRONTEND_DEVELOPER_REALTIME_GUIDE.md) - Frontend integration
- [Database Documentation](../DATABASE_DOCUMENTATION.md) - Database schema

---

## 🎯 Next Steps

After seeding and testing:

1. **Review Test Results:** Check `test-results.json` for any failures
2. **Update Credentials:** Change default passwords in production
3. **Configure Stores:** Add real store coordinates for geofencing
4. **Create More Employees:** Use the API to create additional employees
5. **Test Real-Time:** Connect WebSocket client to test real-time updates

---

**Last Updated:** 2026-02-28
