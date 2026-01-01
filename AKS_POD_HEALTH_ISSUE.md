# AKS Pod Health Issue - Root Cause Analysis

## Problem Identified

From Azure Portal AKS Workloads view:

### Production Namespace (`etelios-backend-prod`)
- **hr-service**: ⚠️ **1/2** pods ready (1 pod unhealthy)
- **auth-service**: ⚠️ **1/2** pods ready
- **attendance-service**: ⚠️ **1/2** pods ready
- Many other services: ⚠️ **0/2** pods ready

### Development Namespace (`etelios-backend-dev`)
- **hr-service**: ⚠️ **0/1** pods ready (completely down)
- **auth-service**: ⚠️ **0/1** pods ready
- **attendance-service**: ⚠️ **0/1** pods ready

## Why Old Code is Running

**The unhealthy pods are likely:**
1. **Crashing on startup** - Syntax errors, missing dependencies, or configuration issues
2. **Running old code** - Not restarted after latest deployment
3. **Failing health checks** - Service is up but not responding correctly
4. **Stuck in crash loop** - Pods restarting repeatedly with old code

When only 1 out of 2 pods is healthy:
- Requests might hit the unhealthy pod (old code)
- Load balancer might route to unhealthy pod
- Service appears partially functional but inconsistent

## Immediate Actions Required

### 1. Check Pod Logs
```bash
# Check hr-service logs in production
kubectl logs -n etelios-backend-prod deployment/hr-service --tail=100

# Check for errors
kubectl logs -n etelios-backend-prod deployment/hr-service | grep -i error

# Check pod status
kubectl get pods -n etelios-backend-prod | grep hr-service
```

### 2. Check Pod Status Details
```bash
# Get detailed pod information
kubectl describe pod -n etelios-backend-prod -l app=hr-service

# Check for:
# - CrashLoopBackOff
# - ImagePullBackOff
# - Error events
# - Resource limits
```

### 3. Restart Unhealthy Pods
```bash
# Restart hr-service deployment
kubectl rollout restart deployment/hr-service -n etelios-backend-prod

# Or delete unhealthy pods (they will auto-restart)
kubectl delete pod -n etelios-backend-prod -l app=hr-service --field-selector=status.phase!=Running
```

### 4. Verify Code in Running Pod
```bash
# Get pod name
kubectl get pods -n etelios-backend-prod | grep hr-service

# Check code version in pod
kubectl exec -n etelios-backend-prod <pod-name> -- cat /app/src/controllers/hrController.js | grep "requiredFields"

# Should show: const requiredFields = ['email', 'department'];
```

## Common Causes of Pod Unhealthiness

1. **Syntax Errors** - Code won't start
2. **Missing Dependencies** - npm install failed
3. **Environment Variables** - Missing or incorrect config
4. **Database Connection** - Can't connect to Cosmos DB
5. **Resource Limits** - Out of memory/CPU
6. **Health Check Failures** - Endpoint not responding
7. **Old Docker Image** - Cached image with old code

## Verification Steps

After fixing pods:

1. **Check Pod Status**
   ```bash
   kubectl get pods -n etelios-backend-prod | grep hr-service
   # Should show: 2/2 Ready ✅
   ```

2. **Test API Endpoints**
   ```bash
   node scripts/test-aks-endpoints.js
   ```

3. **Verify Latest Code**
   - Employee creation should work without fullName
   - Error message should be: "Missing required fields: fullName (or firstName and lastName)"

## Expected Result

After fixing:
- ✅ All pods healthy (2/2 ready)
- ✅ Latest code running
- ✅ Employee creation working
- ✅ Consistent API responses

