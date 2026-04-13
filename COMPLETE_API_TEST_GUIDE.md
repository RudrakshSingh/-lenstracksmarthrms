# 🧪 Complete API Test Guide - api.etelios.com

**Test all endpoints:** auth, onboarding, attendance, document, admin, store, department, roster

---

## 🔍 Test Commands

### 1. Health & Root Endpoints

```bash
# Root endpoint
curl -I https://api.etelios.com/ --max-time 10

# Health check
curl -I https://api.etelios.com/health --max-time 10
```

---

### 2. Auth Service APIs

```bash
# Auth health
curl -I https://api.etelios.com/api/auth/health --max-time 10

# Auth status
curl -I https://api.etelios.com/api/auth/status --max-time 10

# Auth login (test)
curl -X POST https://api.etelios.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' \
  --max-time 10

# Auth register (test)
curl -X POST https://api.etelios.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}' \
  --max-time 10
```

---

### 3. HR Service - Stores

```bash
# Get stores
curl -I https://api.etelios.com/api/hr/stores --max-time 10

# Get stores (with auth - if you have token)
curl https://api.etelios.com/api/hr/stores \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT" \
  --max-time 10
```

---

### 4. HR Service - Departments

```bash
# Get departments
curl -I https://api.etelios.com/api/hr/departments --max-time 10

# Get departments (with auth)
curl https://api.etelios.com/api/hr/departments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT" \
  --max-time 10
```

---

### 5. HR Service - Employees & Onboarding

```bash
# Get employees
curl -I https://api.etelios.com/api/hr/employees --max-time 10

# Onboarding endpoint
curl -I https://api.etelios.com/api/hr/onboarding --max-time 10

# Onboarding upload (POST)
curl -X POST https://api.etelios.com/api/hr/onboarding/upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT" \
  --max-time 10
```

---

### 6. Attendance Service

```bash
# Attendance status
curl -I https://api.etelios.com/api/attendance/status --max-time 10

# Attendance health
curl -I https://api.etelios.com/api/attendance/health --max-time 10

# Today's attendance
curl -I https://api.etelios.com/api/attendance/today --max-time 10

# Attendance summary
curl -I https://api.etelios.com/api/attendance/summary --max-time 10

# Clock in (POST)
curl -X POST https://api.etelios.com/api/attendance/clock-in \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT" \
  -d '{}' \
  --max-time 10
```

---

### 7. Document Service

```bash
# Get documents
curl -I https://api.etelios.com/api/documents --max-time 10

# Document upload (POST)
curl -X POST https://api.etelios.com/api/documents/upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT" \
  --max-time 10
```

---

### 8. Admin Service

```bash
# Admin endpoint
curl -I https://api.etelios.com/api/admin --max-time 10

# Platform endpoint
curl -I https://api.etelios.com/api/platform --max-time 10

# System endpoint
curl -I https://api.etelios.com/api/system --max-time 10
```

---

### 9. Roster Service

```bash
# Get roster
curl -I https://api.etelios.com/api/hr/roster --max-time 10

# Roster settings
curl -I https://api.etelios.com/api/hr/roster/settings --max-time 10

# Create roster (POST)
curl -X POST https://api.etelios.com/api/hr/roster \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT" \
  -d '{}' \
  --max-time 10
```

---

### 10. Additional HR Endpoints

```bash
# HR service root
curl -I https://api.etelios.com/api/hr --max-time 10

# HR status
curl -I https://api.etelios.com/api/hr/status --max-time 10

# HR health
curl -I https://api.etelios.com/api/hr/health --max-time 10

# Get roles
curl -I https://api.etelios.com/api/hr/roles --max-time 10

# Time tracking
curl -I https://api.etelios.com/api/time-tracking --max-time 10

# Performance
curl -I https://api.etelios.com/api/performance --max-time 10
```

---

### 11. Tenant Registry

```bash
# Tenant endpoint
curl -I https://api.etelios.com/api/tenant --max-time 10

# Get tenants
curl -I https://api.etelios.com/api/tenants --max-time 10
```

---

## 🚀 Quick Test Script

Run this script to test all endpoints:

```bash
#!/bin/bash

BASE_URL="https://api.etelios.com"

echo "Testing all APIs..."

# Health
echo "1. Health:"
curl -I $BASE_URL/health --max-time 5

# Auth
echo "2. Auth:"
curl -I $BASE_URL/api/auth/health --max-time 5

# HR
echo "3. HR:"
curl -I $BASE_URL/api/hr/health --max-time 5

# Attendance
echo "4. Attendance:"
curl -I $BASE_URL/api/attendance/health --max-time 5

# Stores
echo "5. Stores:"
curl -I $BASE_URL/api/hr/stores --max-time 5

# Departments
echo "6. Departments:"
curl -I $BASE_URL/api/hr/departments --max-time 5

# Roster
echo "7. Roster:"
curl -I $BASE_URL/api/hr/roster --max-time 5

# Documents
echo "8. Documents:"
curl -I $BASE_URL/api/documents --max-time 5

# Admin
echo "9. Admin:"
curl -I $BASE_URL/api/admin --max-time 5

echo "Done!"
```

---

## 📋 Expected Responses

- **200 OK:** Endpoint working
- **401 Unauthorized:** Endpoint exists but needs authentication
- **403 Forbidden:** Endpoint exists but access denied
- **404 Not Found:** Endpoint doesn't exist
- **500 Server Error:** Server error

---

## ✅ Test Results Format

For each endpoint, check:
1. **HTTP Status Code** (200, 401, 403, 404, 500)
2. **Response Time** (should be < 1 second)
3. **Response Body** (if any)

---

**Run these commands to test all APIs!**
