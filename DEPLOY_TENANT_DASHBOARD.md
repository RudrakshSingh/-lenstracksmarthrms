# 🚀 Tenant Admin Dashboard - ELB Deployment Guide

## Quick Deploy

```bash
# Script ko executable banao
chmod +x scripts/deploy-tenant-dashboard-to-elb.sh

# Deploy karo
./scripts/deploy-tenant-dashboard-to-elb.sh
```

---

## 📋 Kya Hoga?

1. ✅ **Docker Image Build** - hr-service ka latest image build hoga
2. ✅ **ECR Push** - Image AWS ECR me push hoga
3. ✅ **Kubernetes Update** - EKS deployment update hoga
4. ✅ **Rollout** - New pods start honge
5. ✅ **Verification** - Deployment verify hoga

**Time:** ~5-10 minutes

---

## 🧪 Testing After Deployment

### Production me Test Karo

```bash
# Test script run karo
API_BASE_URL=https://api.etelios.com \
TEST_TOKEN=your-jwt-token \
TENANT_ID=lenstrack \
node scripts/test-tenant-admin-dashboard.js
```

### Manual Test (curl)

```bash
# Stats endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "X-Tenant-Id: lenstrack" \
     https://api.etelios.com/api/dashboard/stats

# Top Performers
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "X-Tenant-Id: lenstrack" \
     https://api.etelios.com/api/dashboard/top-performers

# Top Sales
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "X-Tenant-Id: lenstrack" \
     https://api.etelios.com/api/dashboard/top-sales

# Recent Activities
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "X-Tenant-Id: lenstrack" \
     https://api.etelios.com/api/dashboard/recent-activities
```

---

## ✅ Endpoints

1. **GET /api/dashboard/stats**
   - Returns: totalEmployees, activeEmployees, departments, locations, revenue, expenses, etc.

2. **GET /api/dashboard/top-performers**
   - Returns: Array of top performing employees

3. **GET /api/dashboard/top-sales**
   - Returns: Array of top sales transactions

4. **GET /api/dashboard/recent-activities**
   - Returns: Array of recent activities

---

## 🔍 Troubleshooting

### Check Pod Status
```bash
kubectl get pods -n etelios-prod | grep hr-service
```

### Check Pod Logs
```bash
POD_NAME=$(kubectl get pods -n etelios-prod -l app=hr-service -o jsonpath='{.items[0].metadata.name}')
kubectl logs -f $POD_NAME -n etelios-prod
```

### Check Deployment Status
```bash
kubectl rollout status deployment/hr-service -n etelios-prod
```

### Restart Deployment (if needed)
```bash
kubectl rollout restart deployment/hr-service -n etelios-prod
```

---

## 📝 Notes

- All endpoints require **Bearer token** authentication
- All endpoints support **X-Tenant-Id** header for tenant isolation
- Routes mounted at `/api/dashboard/*` for tenant admin dashboard
- Also available at `/api/hr/dashboard/*` for backward compatibility
