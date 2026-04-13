# 🚀 Quick Deploy - 7 APIs Fix

## ⚡ One Command Deployment

```bash
./deploy-7-apis-fix.sh
```

**Time:** ~5-10 minutes  
**What it does:** Builds, pushes, and deploys payroll-service and hr-service with all fixes

---

## ✅ What Gets Fixed

### Payroll Service (3 APIs)
- ✅ `GET /api/payroll/health` - Fixed 504 timeout
- ✅ `POST /api/payroll/calculate` - Fixed 504 timeout  
- ✅ `GET /api/payroll/salary` - Fixed 504 timeout

### HR Service (2 APIs)
- ✅ `GET /api/hr/performance/employee/:id` - Fixed 404
- ✅ `GET /api/hr/employee/:id` - Fixed 404

**Total: 5 APIs fixed** (plus 2 more from previous fixes)

---

## 📋 Prerequisites

1. **AWS CLI configured:**
   ```bash
   aws sts get-caller-identity
   ```

2. **Docker running:**
   ```bash
   docker ps
   ```

3. **kubectl installed:**
   ```bash
   kubectl version --client
   ```

---

## 🚀 Run Deployment

```bash
cd /Users/rudrakshsingh/Desktop/lenstracksmarthrms
./deploy-7-apis-fix.sh
```

### What Happens:

```
[00:00] 🚀 Deploying 7 APIs Fix
[00:05] ✅ AWS access verified
[00:10] ✅ ECR login successful
[00:15] ✅ Kubeconfig updated
[02:00] ✅ payroll-service image built and pushed
[04:00] ✅ hr-service image built and pushed
[05:00] ✅ payroll-service deployed successfully
[07:00] ✅ hr-service deployed successfully
[08:00] ✅ DEPLOYMENT COMPLETE!
```

---

## ✅ Verify After Deployment

### 1. Check Pods
```bash
kubectl get pods -n etelios-prod | grep -E "payroll|hr-service"
```

Should show:
```
payroll-service-xxx   1/1   Running
hr-service-xxx        1/1   Running
```

### 2. Test APIs

```bash
# Get ALB URL
ALB_URL=$(kubectl get ingress -n etelios-prod -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}')

# Test Payroll Health
curl http://${ALB_URL}/api/payroll/health

# Test HR Health
curl http://${ALB_URL}/api/hr/health
```

### 3. Run Full Test
```bash
./test-complete-end-to-end-flow.sh
```

---

## 🐛 Troubleshooting

### Issue: Build fails
```bash
# Check Docker is running
docker ps

# Check AWS credentials
aws sts get-caller-identity
```

### Issue: Deployment fails
```bash
# Check pods
kubectl get pods -n etelios-prod

# Check logs
kubectl logs -n etelios-prod deployment/payroll-service
kubectl logs -n etelios-prod deployment/hr-service
```

### Issue: APIs still not working
```bash
# Wait 2-3 minutes for pods to be fully ready
kubectl get pods -n etelios-prod -w

# Check service endpoints
kubectl get svc -n etelios-prod
```

---

## 📊 Expected Results

### Before:
- ❌ Payroll health: 504 Gateway Timeout
- ❌ Payroll calculate: 504 Gateway Timeout
- ❌ Payroll salary: 504 Gateway Timeout
- ❌ Performance employee: 404 Not Found
- ❌ HR employee: 404 Not Found

### After:
- ✅ Payroll health: 200 OK (immediate)
- ✅ Payroll calculate: 200 OK (fast)
- ✅ Payroll salary: 200 OK or 503 (if DB not connected)
- ✅ Performance employee: 200 OK (with data)
- ✅ HR employee: 200 OK (with data)

---

## 🎯 Success!

After deployment, all 7 APIs should be working! 🎉

**Status**: ✅ Ready to deploy  
**Script**: `./deploy-7-apis-fix.sh`  
**Time**: ~5-10 minutes
