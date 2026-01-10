# 🔄 Pipeline Monitoring Guide - Jan 8, 2026

**Pipeline Status:** Running  
**Commit:** 4abaea7  
**Started:** ~20:45 IST  
**Expected Completion:** ~20:55 IST (10-12 minutes)

---

## 📊 Current Situation

### ❌ Problems Before Fix:
- Multiple pods stuck in `ImagePullBackOff`
- ACR secret creation failing with "Please run 'az login'"
- Pipeline using wrong service connection name

### ✅ What We Fixed:
1. **ACR Authentication:** Changed `Bash@3` → `AzureCLI@2`
2. **Service Connection:** Fixed to `Azure-Service-Connection`
3. **Database Config:** Added real MongoDB URI
4. **Employee Creation:** Fixed 500 errors
5. **Environment Loading:** Enhanced debugging

---

## 🎯 Expected Results After Pipeline

### Before (Current):
```
NAME                           READY   STATUS
auth-service-5c7f77794f-xxx    0/1     ImagePullBackOff  ❌
api-gateway-5d5dc94546-xxx     0/1     ImagePullBackOff  ❌
analytics-service-69669-xxx    0/1     ImagePullBackOff  ❌
```

### After (Expected):
```
NAME                           READY   STATUS
auth-service-XXXXXXXX-xxx      1/1     Running  ✅
api-gateway-XXXXXXXX-xxx       1/1     Running  ✅
analytics-service-XXXXXXXX-xxx 1/1     Running  ✅
hr-service-XXXXXXXX-xxx        1/1     Running  ✅
```

---

## ⏰ Pipeline Timeline

| Time | Stage | What's Happening |
|------|-------|------------------|
| 0 min | Trigger | Push to main branch |
| 1-5 min | Build | Docker images building & pushing to ACR |
| 3-8 min | Security | Trivy scanning (parallel, non-blocking) |
| 6-10 min | Deploy | K8s manifests applying, ACR secret creating |
| 10-12 min | Complete | New pods rolling out, old pods terminating |

---

## 🔍 Monitor Pipeline

### Azure DevOps Portal:
```
https://dev.azure.com/Hindempire-devops1/etelios/_build
```

### CLI Commands:
```bash
# Watch pods in real-time
kubectl get pods -n etelios-backend-prod -w

# Check deployments
kubectl get deployments -n etelios-backend-prod

# Check if ACR secret was created
kubectl get secret acr-secret -n etelios-backend-prod

# Watch specific service (e.g., hr-service)
kubectl get pods -l app=hr-service -n etelios-backend-prod -w
```

---

## ✅ Verification Steps (After Pipeline Completes)

### 1. Check Pipeline Status
```bash
# Should show all stages green ✅
# Open: https://dev.azure.com/Hindempire-devops1/etelios/_build
```

### 2. Verify ACR Secret Created
```bash
kubectl get secret acr-secret -n etelios-backend-prod

# Should output:
# NAME         TYPE                             DATA   AGE
# acr-secret   kubernetes.io/dockerconfigjson   1      1m
```

### 3. Check All Pods Running
```bash
kubectl get pods -n etelios-backend-prod

# All should show: Running (1/1)
# NO ImagePullBackOff errors! ✅
```

### 4. Verify New Images
```bash
# Check auth-service image (should be new)
kubectl describe pod -l app=auth-service -n etelios-backend-prod | grep Image:

# Should show latest tag with recent timestamp
```

### 5. Check Pod Logs (Optional)
```bash
# Check auth-service logs
kubectl logs -l app=auth-service -n etelios-backend-prod --tail=50

# Check hr-service logs
kubectl logs -l app=hr-service -n etelios-backend-prod --tail=50
```

---

## 🗄️ After Pipeline: Update Database Secrets

### Run This Command:
```bash
cd /Users/rudrakshsingh/Desktop/lenstracksmarthrms
./temp-update-k8s-secret.sh
```

### What It Does:
1. ✅ Gets MongoDB URI from `.env` file
2. ✅ Generates new JWT secrets
3. ✅ Updates Kubernetes secret `etelios-secrets`
4. ✅ Restarts auth-service and hr-service
5. ✅ Waits for pods to be ready
6. ✅ Verifies database connection

### Expected Output:
```
🗄️  Database Setup for LensTrack HRMS
📋 Configuration:
  Resource Group: etelios-resources
  Cosmos DB: etelios-mongo-db
  ...
✅ JWT secrets generated!
✅ Kubernetes secret updated!
✅ Services restart initiated!
✅ Services are ready!
✅ Database connection verified!
```

---

## 🧪 Test APIs (Final Verification)

### 1. Test Health (Should Show DB Connected)
```bash
curl -k https://98.70.245.87/api/hr/health | jq

# Expected:
# {
#   "service": "hr-service",
#   "status": "healthy",
#   "database": "connected"  ← Should be "connected" now!
# }
```

### 2. Test Login (Should Work)
```bash
curl -k -X POST "https://98.70.245.87/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"emailOrEmployeeId":"admin@etelios.com","password":"Admin@123456"}' | jq

# Expected: 200 OK with accessToken
```

### 3. Test Employee Creation (Should Return 201, Not 500!)
```bash
# Get token first
TOKEN=$(curl -k -s -X POST "https://98.70.245.87/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"emailOrEmployeeId":"admin@etelios.com","password":"Admin@123456"}' | jq -r '.data.accessToken')

# Create employee
curl -k -X POST "https://98.70.245.87/api/hr/employees" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "employeeId": "EMP-TEST-001",
    "firstName": "Test",
    "lastName": "Employee",
    "email": "test-'$(date +%s)'@etelios.com",
    "department": "IT",
    "designation": "Software Engineer",
    "jobTitle": "Software Engineer",
    "doj": "2026-01-08",
    "status": "active"
  }' | jq

# Expected:
# Status: 201 Created (NOT 500!)
# Response: { "success": true, "data": { ... employee details ... } }
```

---

## 🎯 Success Checklist

After completing all steps:

- [ ] Pipeline completed successfully (all stages green)
- [ ] ACR secret exists in Kubernetes
- [ ] All pods showing `Running` status (no ImagePullBackOff)
- [ ] Database secret update script ran successfully
- [ ] Health endpoint shows `"database": "connected"`
- [ ] Login API returns token (200 OK)
- [ ] Employee creation returns 201 Created (not 500!)
- [ ] All APIs working correctly

---

## 🐛 Troubleshooting

### Issue: Pipeline Still Failing
```bash
# Check pipeline logs in Azure DevOps
# Look for specific error messages
# Common issues:
# - ACR credentials wrong
# - K8s cluster connection failed
```

### Issue: Pods Still ImagePullBackOff
```bash
# Check if ACR secret exists
kubectl get secret acr-secret -n etelios-backend-prod

# If missing, manually create:
ACR_NAME="eteliosacr"
ACR_SERVER="eteliosacr-hvawabdbgge7e0fu.azurecr.io"
kubectl create secret docker-registry acr-secret \
  --docker-server=$ACR_SERVER \
  --docker-username=$(az acr credential show --name $ACR_NAME --query username -o tsv) \
  --docker-password=$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv) \
  -n etelios-backend-prod
```

### Issue: Database Not Connecting
```bash
# Check secret exists
kubectl get secret etelios-secrets -n etelios-backend-prod

# Verify MONGO_URI in secret
kubectl get secret etelios-secrets -n etelios-backend-prod \
  -o jsonpath='{.data.MONGO_URI}' | base64 -d

# If wrong, run update script again:
./temp-update-k8s-secret.sh
```

### Issue: Employee Creation Still 500
```bash
# Check HR service logs for detailed error
kubectl logs -l app=hr-service -n etelios-backend-prod --tail=100 | grep -A 10 -B 5 "error\|Error"

# Common causes:
# - Database not connected (check logs for MongoDB connection)
# - Missing fields in request (check validation errors)
# - Role not found (check if roles are seeded)
```

---

## 📚 Related Documentation

- **`DEPLOY_NOW.md`** - Quick deployment guide
- **`COMPLETE_FIXES_SUMMARY.md`** - All fixes detailed
- **`DATABASE_SETUP_GUIDE.md`** - Database configuration
- **`DATABASE_QUICK_FIX.md`** - Quick database reference
- **`DATABASE_CONFIGURED.md`** - Configuration summary

---

## 📊 Key Commits

| Commit | Description | Files Changed |
|--------|-------------|---------------|
| 4abaea7 | Fix service connection name | 1 file |
| 604576d | Database config, employee creation, pipeline auth | 29 files |

---

## ⏰ Current Status

**Pipeline:** Running  
**Duration:** ~10-12 minutes  
**Watch:** https://dev.azure.com/Hindempire-devops1/etelios/_build  

**After Pipeline:**
1. Verify pods running
2. Run `./temp-update-k8s-secret.sh`
3. Test APIs
4. 🎉 Done!

---

**Last Updated:** Jan 8, 2026, 20:45 IST  
**Status:** ⏳ Waiting for pipeline to complete...

