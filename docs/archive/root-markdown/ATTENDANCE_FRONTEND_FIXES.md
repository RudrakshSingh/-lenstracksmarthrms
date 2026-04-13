# Attendance API Frontend Fixes

## 🚨 URGENT: Read This First!

**Your frontend is still using `localhost:3000`!**

**Error**: `POST http://localhost:3000/api/attendance/clock-in 404`

**Fix**: Update your API base URL immediately. See `URGENT_FRONTEND_FIX.md` for step-by-step instructions.

---

## 🔴 Critical Issues Found

### 1. Frontend Using Wrong Base URL
**Error**: `POST http://localhost:3000/api/attendance/clock-in 500 (Internal Server Error)`

**Problem**: Frontend is configured to use `localhost:3000` instead of AWS ALB URL.

**Fix**: Update your frontend API base URL configuration:

```javascript
// ❌ WRONG - Current (causing errors)
const API_BASE = 'http://localhost:3000';
// or
const API_BASE = 'http://localhost:3002';

// ✅ CORRECT - Use AWS ALB URL
const API_BASE = 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';
```

**Where to Update**:
- Check your `api-client.ts` or `workforceApi.ts` file
- Look for `baseURL` or `API_BASE` configuration
- Update environment variables if using `.env` file

---

### 2. Clock-In Timeout Error
**Error**: `The operation was aborted due to timeout`

**Root Causes**:
1. **HR Service URL Wrong Port**: Backend was using `http://hr-service:3002` instead of `http://hr-service:80`
   - ✅ **FIXED**: Updated `hrServiceClient.js` to use port 80
   - **Status**: Fix deployed, needs service restart

2. **Employee Already Has Open Session**: 
   - Error: `"Please clock out from your current session before clocking in again"`
   - **Solution**: Check for existing open attendance before clocking in

3. **Employee Not Assigned to Store**:
   - Error: `"Employee not assigned to any store. Please contact HR."`
   - **Solution**: Ensure employee has a store assigned with coordinates

---

### 3. 503 Service Unavailable
**Error**: `GET http://localhost:3000/api/attendance?employeeId=... 503 (Service Unavailable)`

**Causes**:
1. Frontend using wrong base URL (localhost instead of AWS ALB)
2. Service temporarily unavailable
3. Network connectivity issues

**Solutions**:
1. ✅ **Fix Base URL** (see Issue #1 above)
2. Retry after a few seconds
3. Check service health: `GET /api/attendance/health`

---

## ✅ Backend Fixes Applied

### 1. HR Service URL Fix
**File**: `microservices/attendance-service/src/utils/hrServiceClient.js`

**Change**:
```javascript
// Before (WRONG)
const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';

// After (CORRECT)
const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:80';
```

**Why**: Kubernetes services expose on port 80 (ClusterIP), not the container port (3002).

---

## 🚀 Frontend Action Items

### Immediate Fixes Required:

1. **Update API Base URL**
   ```typescript
   // In your api-client.ts or config file
   const API_BASE = process.env.NEXT_PUBLIC_API_URL || 
     'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';
   ```

2. **Add Error Handling for Clock-In**
   ```typescript
   async function clockIn(latitude: number, longitude: number, selfieFile?: File) {
     try {
       // Check for existing open session first
       const openSession = await checkOpenAttendance();
       if (openSession) {
         throw new Error('Please clock out from your current session first');
       }

       const formData = new FormData();
       formData.append('latitude', latitude.toString());
       formData.append('longitude', longitude.toString());
       if (selfieFile) {
         formData.append('selfie', selfieFile);
       }
       formData.append('notes', 'Clock in from mobile app');

       const response = await fetch(`${API_BASE}/api/attendance/clock-in`, {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${token}`,
           'x-tenant-id': tenantId,
           // Don't set Content-Type for FormData
         },
         body: formData,
         signal: AbortSignal.timeout(60000), // 60 second timeout
       });

       if (!response.ok) {
         const error = await response.json();
         throw new Error(error.message || 'Clock-in failed');
       }

       return await response.json();
     } catch (error) {
       if (error.name === 'AbortError') {
         throw new Error('Request timed out. Please check your connection and try again.');
       }
       throw error;
     }
   }
   ```

3. **Add Retry Logic for 503 Errors**
   ```typescript
   async function fetchWithRetry(url: string, options: RequestInit, retries = 3) {
     for (let i = 0; i < retries; i++) {
       try {
         const response = await fetch(url, options);
         if (response.status === 503 && i < retries - 1) {
           await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1))); // Exponential backoff
           continue;
         }
         return response;
       } catch (error) {
         if (i === retries - 1) throw error;
         await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
       }
     }
   }
   ```

---

## 📋 Testing Checklist

After applying fixes:

- [ ] Update API base URL to AWS ALB URL
- [ ] Test login endpoint
- [ ] Test clock-in with GPS coordinates
- [ ] Test clock-in with selfie
- [ ] Test clock-out
- [ ] Test attendance history GET endpoint
- [ ] Verify error handling for timeout scenarios
- [ ] Verify error handling for existing open sessions

---

## 🔍 Debugging Tips

### Check Service Health
```bash
curl http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/health
```

### Test Clock-In Directly
```bash
TOKEN="your-token-here"
curl -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/clock-in" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 19.0760,
    "longitude": 72.8777,
    "notes": "Test clock-in"
  }'
```

### Check for Open Sessions
```bash
curl "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance?employeeId=YOUR_EMPLOYEE_ID&status=open" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto"
```

---

## 📞 Support

If issues persist after applying these fixes:
1. Check browser console for detailed error messages
2. Verify network tab shows requests going to AWS ALB URL (not localhost)
3. Check that employee has a store assigned
4. Verify employee has clocked out from any previous sessions
5. Contact backend team with specific error messages and request IDs

---

**Last Updated**: 2026-02-15  
**Status**: Backend fixes applied, frontend configuration update required
