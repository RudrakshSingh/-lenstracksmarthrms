# Pipeline Rerun Guide

**Date**: 2026-01-02  
**Status**: ✅ Login Working - Pipeline Rerun Recommended (Not Urgent)

---

## 📊 Current Status

### ✅ What's Working
- Login with `emailOrEmployeeId` field: ✅ Working
- Login with `email` field: ✅ Working
- Password: ✅ Fixed in production database
- ACR URL: ✅ Fixed manually

### 🔍 What We Did
1. **Code Changes**: Pushed to Azure DevOps (commit: `fade5f7`)
   - Login accepts both `email` and `emailOrEmployeeId`
   - Schema validation updated

2. **Manual Fixes**:
   - ACR URL updated using `kubectl`
   - Password updated directly in database

---

## ⚠️ Pipeline Rerun Decision

### ✅ **RECOMMENDED** (But Not Urgent)

**Why Rerun:**
1. ✅ Ensures latest code (commit `fade5f7`) is built and deployed
2. ✅ Creates new Docker image with all fixes
3. ✅ Updates deployment with latest image tag
4. ✅ Good practice for production environments
5. ✅ Ensures consistency across deployments

**Why Not Urgent:**
- ❌ Login is already working
- ❌ Manual fixes are applied
- ❌ System is functional
- ❌ No critical issues

---

## 🔄 How to Rerun Pipeline

### Option 1: Azure DevOps Portal
1. Go to Azure DevOps portal
2. Navigate to Pipelines
3. Find the auth-service pipeline
4. Click "Run pipeline"
5. Wait for build and deployment to complete

### Option 2: Azure CLI
```bash
az pipelines run --name "auth-service-pipeline" --organization "Hindempire-devops1" --project "etelios"
```

### Option 3: Wait for Automatic Trigger
- If pipeline is set to trigger on `main` branch push
- It should have already triggered when we pushed commit `fade5f7`
- Check pipeline history to verify

---

## 📋 After Pipeline Completion

### Verify Deployment
```bash
# Check auth-service pods
kubectl get pods -n etelios-backend-prod | grep auth-service

# Check deployment status
kubectl rollout status deployment/auth-service -n etelios-backend-prod

# Check image
kubectl get deployment auth-service -n etelios-backend-prod \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

### Test Login
```bash
# Test with 'email' field
curl -k -X POST "https://98.70.245.87/api/auth/login" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@etelios.com","password":"Admin@123456"}'

# Test with 'emailOrEmployeeId' field
curl -k -X POST "https://98.70.245.87/api/auth/login" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{"emailOrEmployeeId":"admin@etelios.com","password":"Admin@123456"}'
```

---

## 🎯 Recommendation

### **Rerun Pipeline When:**
- ✅ You have time to monitor the deployment
- ✅ You want to ensure latest code is deployed
- ✅ You're doing a scheduled maintenance window
- ✅ You want to follow best practices

### **Can Skip If:**
- ❌ Login is working (which it is)
- ❌ No critical issues
- ❌ Manual fixes are sufficient for now
- ❌ You'll rerun later during next deployment cycle

---

## 📝 Summary

**Current Status**: ✅ Login Working  
**Pipeline Rerun**: ⚠️ Recommended but Not Urgent  
**Action**: Your choice - system is functional either way

---

**Decision**: You can rerun the pipeline when convenient, but it's not blocking anything right now since login is already working.

