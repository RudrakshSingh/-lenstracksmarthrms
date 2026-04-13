# HR Service Infrastructure Analysis & Recommendations

**Date:** 2026-03-03  
**Analysis Type:** Performance, Network, Scaling, Monitoring

## Executive Summary

**✅ RESOLVED**: The attendance service was experiencing timeouts when querying the HR service for employee data. **Root cause identified and fixed**: Port mismatch (attendance-service was connecting to port 80, but HR service listens on port 3002).

**Current Status**: Network connectivity is working. Employee lookup is successful. Remaining issue: Employee needs store assignment in HR service.

---

## 1. Database Performance Analysis

### Current Issues

#### 1.1 Query Performance Problems
- **Slow `.populate()` calls**: The `getEmployeeById` function uses `.populate('store')` and `.populate('departmentRef')` which can be slow
- **Inefficient `$or` queries**: Employee lookup uses `$or` with 4 conditions, which may not use indexes efficiently:
  ```javascript
  $or: [
    { employee_id: normalizedId.toUpperCase() },
    { employee_id: normalizedId },
    { employeeId: normalizedId.toUpperCase() },
    { employeeId: normalizedId }
  ]
  ```
- **Multiple fallback queries**: The code tries queries with tenantId, then without tenantId, doubling query time
- **5-second query timeout**: Queries are timing out even with 5-second maxTimeMS

#### 1.2 Missing Indexes
- **Missing compound index**: No index on `{ _id: 1, tenantId: 1 }` for direct MongoDB _id lookups with tenant filtering
- **Index on employee_id variants**: The `$or` query with `employee_id` and `employeeId` may not use the existing `{ tenantId: 1, employeeId: 1 }` index efficiently

#### 1.3 Existing Indexes (Good)
✅ `{ tenantId: 1, employeeId: 1 }` - Unique compound index  
✅ `{ tenantId: 1, email: 1 }` - Fast email lookup  
✅ `{ tenantId: 1, status: 1 }` - Tenant-based queries  
✅ Field-level indexes on `employee_id`, `employeeId`, `email`

### Recommendations

#### Immediate Actions
1. **Add compound index for direct _id lookups**:
   ```javascript
   userSchema.index({ _id: 1, tenantId: 1 });
   ```

2. **Optimize populate calls**: Use `.select()` to limit populated fields:
   ```javascript
   .populate('store', 'name address _id')  // Only get needed fields
   .populate('departmentRef', 'name code _id')
   ```

3. **Add query timeout monitoring**: Log slow queries (>1 second) to identify bottlenecks

4. **Consider removing fallback queries**: If tenantId is always provided, remove the "try without tenantId" fallback to reduce query time

#### Long-term Actions
1. **Add database query monitoring**: Use MongoDB profiler to identify slow queries
2. **Consider caching frequently accessed employees**: Cache employee data in Redis
3. **Database connection pooling**: Ensure proper connection pool sizing

---

## 2. Network Connectivity Analysis

### Current Issues

#### 2.1 Connection Test Results
- ❌ **Connection test failed**: `nc -zv hr-service 80` timed out from attendance-service pod
- ❌ **Health check timeout**: HR service health endpoint is not reachable

#### 2.2 Network Policies
- ✅ **No network policies found**: Network policies are not blocking traffic (good)

### Root Cause ✅ FIXED
**Identified**: Port mismatch!
- **HR service Kubernetes service**: Exposes port **3002** (not 80)
- **HR service container**: Listens on port **3002**
- **Attendance service**: Was trying to connect to port **80** ❌

**Fix Applied**: Updated all HR_SERVICE_URL references from `http://hr-service:80` to `http://hr-service:3002`

**Files Updated**:
- `microservices/attendance-service/src/utils/hrServiceClient.js`
- `microservices/attendance-service/src/utils/healthMonitor.js`
- `microservices/attendance-service/src/services/attendance.service.js`
- `microservices/attendance-service/src/controllers/attendanceController.js`

### Recommendations ✅ COMPLETED

#### Actions Taken
1. ✅ **Verified HR service port**: Confirmed service exposes port 3002
2. ✅ **Fixed attendance-service configuration**: Updated all HR_SERVICE_URL to use port 3002
3. ✅ **Deployed fix**: New deployment is live
4. ✅ **Verified connectivity**: Employee lookup now works (no more timeouts)

#### Verification Results
- **Service Port**: 3002 ✅
- **Endpoints**: 2 pods registered ✅
- **Connection**: Working ✅
- **Employee Lookup**: Successful ✅

#### Long-term Actions
1. **Add network monitoring**: Use service mesh (Istio) or network monitoring tools
2. **Implement health checks**: Ensure HR service has proper liveness/readiness probes
3. **Add retry logic**: Implement exponential backoff for failed connections

---

## 3. Scaling Analysis

### Current State
- **Replicas**: 2 (configured and running)
- **Current pods**: 2
- **Status**: All pods running

### Analysis
- **2 replicas may be insufficient** if:
  - Database queries are slow (blocking requests)
  - High request volume
  - Pods are CPU/memory constrained

### Recommendations

#### Immediate Actions
1. **Scale up HR service**:
   ```bash
   kubectl scale deployment hr-service -n etelios-prod --replicas=3
   ```

2. **Monitor resource usage**:
   ```bash
   kubectl top pods -n etelios-prod -l app=hr-service
   ```

3. **Check HPA (Horizontal Pod Autoscaler)**:
   ```bash
   kubectl get hpa -n etelios-prod
   ```

#### Long-term Actions
1. **Implement HPA**: Auto-scale based on CPU/memory or request rate
2. **Add resource limits**: Ensure pods have proper resource requests/limits
3. **Consider vertical scaling**: Increase CPU/memory if queries are CPU-intensive

---

## 4. Circuit Breaker Monitoring

### Current State
- ✅ **Circuit breaker initialized**: HR_SERVICE circuit breaker is active
- ✅ **Configuration**: 
  - Failure threshold: 2
  - Reset timeout: 10 seconds
  - Monitoring window: 30 seconds

### Issues
- ⚠️ **No failure logs**: Circuit breaker hasn't opened yet (or logs not showing)
- ⚠️ **No metrics endpoint**: Circuit breaker state not exposed via API

### Recommendations

#### Immediate Actions
1. **Add circuit breaker metrics endpoint**:
   ```javascript
   // In attendance-service
   router.get('/health/circuit-breakers', (req, res) => {
     res.json({
       hrService: hrServiceBreaker.getState()
     });
   });
   ```

2. **Log circuit breaker state changes**: Already implemented, verify logs are visible

3. **Add Prometheus metrics**: Export circuit breaker metrics for monitoring

#### Long-term Actions
1. **Dashboard**: Create Grafana dashboard for circuit breaker metrics
2. **Alerting**: Set up alerts when circuit breaker opens
3. **Historical tracking**: Track circuit breaker open/close frequency

---

## 5. Priority Action Plan

### 🔴 Critical (Do First)
1. **Fix network connectivity** - Verify HR service is accessible
2. **Add database index** - `{ _id: 1, tenantId: 1 }` for faster lookups
3. **Scale HR service** - Increase to 3-4 replicas

### 🟡 High Priority (Do Next)
4. **Optimize populate calls** - Reduce populated fields
5. **Add query monitoring** - Log slow queries
6. **Add circuit breaker metrics endpoint**

### 🟢 Medium Priority (Do Soon)
7. **Remove fallback queries** - If tenantId is always provided
8. **Implement HPA** - Auto-scaling
9. **Add database connection pooling monitoring**

---

## 6. Monitoring Commands

### Check HR Service Health
```bash
# Check pods
kubectl get pods -n etelios-prod -l app=hr-service

# Check service
kubectl get svc hr-service -n etelios-prod

# Check endpoints
kubectl get endpoints hr-service -n etelios-prod

# Test connectivity
kubectl exec -n etelios-prod <attendance-pod> -- wget -O- --timeout=2 http://hr-service:80/api/hr/health
```

### Check Circuit Breaker State
```bash
# View circuit breaker logs
kubectl logs -n etelios-prod -l app=attendance-service | grep -i "circuit breaker"

# Check circuit breaker metrics (if endpoint exists)
curl http://<attendance-service>/health/circuit-breakers
```

### Check Database Performance
```bash
# View HR service logs for slow queries
kubectl logs -n etelios-prod -l app=hr-service | grep -i "slow\|timeout\|query"

# Check MongoDB connection (if accessible)
kubectl exec -n etelios-prod <hr-pod> -- mongosh --eval "db.currentOp({'active': true, 'secs_running': {'$gt': 1}})"
```

---

## 7. Expected Outcomes

After implementing these recommendations:
- ✅ **Faster employee lookups**: <500ms (down from >5s)
- ✅ **Better reliability**: Circuit breaker prevents cascading failures
- ✅ **Improved scalability**: Auto-scaling handles load spikes
- ✅ **Better observability**: Metrics and logs for troubleshooting

---

## 8. Next Steps

1. **Immediate**: Fix network connectivity issue
2. **Today**: Add database index and scale HR service
3. **This Week**: Optimize queries and add monitoring
4. **This Month**: Implement HPA and comprehensive monitoring
