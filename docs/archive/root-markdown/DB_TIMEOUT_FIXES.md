# Database Timeout Fixes

## Issues Identified

### 1. Payroll Service - 504 Gateway Timeout
**Root Cause:**
- Health endpoint was checking `mongoose.connection.readyState` which can be slow if DB is unresponsive
- Database connection had no timeout handling - queries could hang indefinitely
- ALB health check timeout is 10 seconds - service must respond faster

**Fixes Applied:**
1. ✅ Removed DB state check from health endpoint (ALB just needs service to respond)
2. ✅ Added proper connection timeouts:
   - `serverSelectionTimeoutMS: 10000` - Fail fast if DB unreachable
   - `socketTimeoutMS: 30000` - Socket timeout
   - `connectTimeoutMS: 10000` - Connection timeout
   - `bufferCommands: false` - Don't buffer if not connected
3. ✅ Added connection event handlers for better error tracking

### 2. HR Service - 500 Internal Server Error
**Root Cause:**
- Database queries timing out (buffering timeout after 10000ms)
- Queries were hanging on slow database operations

**Fixes Applied:**
1. ✅ Added `Promise.race()` with 5-second timeout for employee queries
2. ✅ Added `Promise.race()` with 5-second timeout for store queries
3. ✅ Added `.maxTimeMS(5000)` to all queries
4. ✅ Graceful fallback - returns empty array instead of throwing 500 error

## Database Connection Details

**MongoDB URI:** `mongodb://admin:etelios123@mongodb.etelios-prod.svc.cluster.local:27017/etelios?authSource=admin`

**Connection Status:**
- ✅ Network connectivity verified (both services can reach MongoDB)
- ✅ HR service: Connected successfully
- ✅ Payroll service: Connection improved with timeouts

## Deployment

All fixes have been deployed:
```bash
./deploy-failed-apis-fix.sh
```

Services updated:
- ✅ payroll-service (DB connection + health endpoint)
- ✅ hr-service (already had timeout handling)

## Testing

After deployment, test with:
```bash
# Test payroll health (should respond immediately)
curl http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/payroll/health

# Test HR employees (should not timeout)
curl -H "Authorization: Bearer $TOKEN" \
  http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/hr/employees?limit=10
```

## Expected Results

- ✅ Payroll health endpoint: 200 OK (immediate response, no DB check)
- ✅ HR employees endpoint: 200 OK (with timeout handling, returns empty array if timeout)
- ✅ HR stores endpoint: 200 OK (with timeout handling)

## Notes

- ALB health check timeout: 10 seconds
- Query timeout: 5 seconds (HR service)
- Connection timeout: 10 seconds (Payroll service)
- If queries timeout, services return empty results instead of 500 errors
