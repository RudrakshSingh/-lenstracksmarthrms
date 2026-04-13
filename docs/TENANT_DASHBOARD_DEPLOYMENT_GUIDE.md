# Tenant Admin Dashboard - Deployment Guide

## 📋 Code Update Process

### Step 1: Local Changes Commit Karo

```bash
# Dashboard files ko stage karo
git add microservices/hr-service/src/controllers/dashboardController.js
git add microservices/hr-service/src/routes/dashboard.routes.js
git add microservices/hr-service/src/server.js
git add scripts/test-tenant-admin-dashboard.js

# Commit karo
git commit -m "feat: Add Tenant Admin Dashboard endpoints (stats, top-performers, top-sales, recent-activities)"
```

### Step 2: GitHub pe Push Karo

```bash
# Main branch pe push karo
git push origin main
```

### Step 3: CI/CD Pipeline Automatically Deploy Karega

- GitHub Actions ya Azure DevOps pipeline automatically trigger hoga
- hr-service ka Docker image build hoga
- Kubernetes deployment update hoga
- Production me new code deploy ho jayega

---

## 🧪 Testing After Deployment

### Local Testing (Before Push)

```bash
# Test script run karo
TEST_TOKEN=your-jwt-token TENANT_ID=lenstrack node scripts/test-tenant-admin-dashboard.js
```

### Production Testing (After Deployment)

```bash
# Production URL ke saath test karo
API_BASE_URL=https://api.etelios.com TEST_TOKEN=your-token TENANT_ID=lenstrack node scripts/test-tenant-admin-dashboard.js
```

---

## ✅ Endpoints to Test

1. **GET /api/dashboard/stats**
   - Returns: totalEmployees, activeEmployees, departments, locations, revenue, expenses, etc.

2. **GET /api/dashboard/top-performers**
   - Returns: Array of top performing employees with sales data

3. **GET /api/dashboard/top-sales**
   - Returns: Array of top sales transactions

4. **GET /api/dashboard/recent-activities**
   - Returns: Array of recent activities with type, action, user, timestamp

---

## 🔍 Verify Deployment

1. Check Kubernetes pods:
   ```bash
   kubectl get pods -n default | grep hr-service
   ```

2. Check pod logs:
   ```bash
   kubectl logs -f <hr-service-pod-name> -n default
   ```

3. Test endpoints via curl:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        -H "X-Tenant-Id: lenstrack" \
        https://api.etelios.com/api/dashboard/stats
   ```

---

## 📝 Notes

- All endpoints require authentication (Bearer token)
- All endpoints support X-Tenant-Id header for tenant isolation
- Routes are mounted at `/api/dashboard/*` for tenant admin dashboard
- Also available at `/api/hr/dashboard/*` for backward compatibility
