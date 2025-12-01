# CORS Fix - Final Solution

## Problem
CORS preflight requests are failing:
```
Access to fetch at 'https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login' 
from origin 'https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Root Cause
OPTIONS requests are not being handled correctly before they reach the proxy middleware. The CORS headers need to be set immediately for OPTIONS requests.

## Fixes Applied

### 1. Enhanced Global OPTIONS Handler
- Added explicit `next` parameter (even though we don't use it)
- Ensured immediate response with `return res.sendStatus(200)`
- Added all required CORS headers including `Cache-Control` and `Pragma`

### 2. Enhanced Service-Specific OPTIONS Handler
- Updated `app.options(basePath + '*')` handler
- Added all required headers
- Ensured immediate response

### 3. Enhanced Proxy Middleware OPTIONS Handler
- Updated fallback OPTIONS handler in `app.use(basePath, ...)`
- Added all required headers
- Ensured immediate response

## Key Changes

**File:** `src/server.js`

1. **Global OPTIONS Handler (Line ~50):**
   ```javascript
   app.options('*', (req, res, next) => {
     const origin = req.headers.origin;
     const allowedOrigin = origin || '*';
     res.header('Access-Control-Allow-Origin', allowedOrigin);
     res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
     res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Requested-With, Origin, Accept, Cache-Control, Pragma');
     res.header('Access-Control-Allow-Credentials', 'true');
     res.header('Access-Control-Max-Age', '86400');
     return res.sendStatus(200);
   });
   ```

2. **Service-Specific OPTIONS Handler:**
   - Same pattern for each service's basePath

3. **Proxy Middleware OPTIONS Handler:**
   - Fallback handler in case others don't catch it

## Verification Steps

### Step 1: Test OPTIONS Request

```bash
curl -X OPTIONS \
  -H "Origin: https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v \
  https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login
```

**Expected Response:**
- Status: `200 OK`
- Headers:
  - `Access-Control-Allow-Origin: https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net`
  - `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD`
  - `Access-Control-Allow-Headers: Content-Type, Authorization, ...`
  - `Access-Control-Allow-Credentials: true`

### Step 2: Test Actual POST Request

```bash
curl -X POST \
  -H "Origin: https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}' \
  -v \
  https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login
```

**Expected Response:**
- Status: `200` or `401` (depending on credentials)
- CORS headers present in response

### Step 3: Check Browser Console

After deployment, test from browser:
- Open browser DevTools → Network tab
- Try to login from frontend
- Check OPTIONS request:
  - Should return `200 OK`
  - Should have all CORS headers
- Check POST request:
  - Should succeed (or fail with proper error, not CORS error)

## Deployment

1. **Commit and Push:**
   ```bash
   git add src/server.js CORS-FIX-FINAL.md
   git commit -m "Fix: CORS preflight requests - enhance OPTIONS handlers"
   git push origin main
   ```

2. **Wait for Azure DevOps Pipeline:**
   - Pipeline should automatically build and deploy
   - Check deployment logs

3. **Restart App Service (if needed):**
   ```bash
   az webapp restart --name etelios-app-service --resource-group Etelios-rg
   ```

4. **Verify:**
   - Test OPTIONS request (see Step 1)
   - Test actual login from frontend
   - Check browser console for CORS errors

## Troubleshooting

### Issue 1: Still Getting CORS Error

**Check:**
1. Is the API Gateway service running?
   ```bash
   curl https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/health
   ```

2. Are the latest changes deployed?
   - Check Azure DevOps pipeline status
   - Check App Service deployment logs

3. Is the service restarted?
   - Restart App Service manually if needed

### Issue 2: OPTIONS Returns 404

**Cause:** OPTIONS handler not registered before other routes

**Solution:** The `app.options('*')` handler is at the very top, before any other middleware. If still getting 404, check middleware order.

### Issue 3: CORS Headers Missing in Response

**Cause:** Headers not being set correctly

**Solution:** 
- Check if `res.header()` is being called
- Verify headers are set before `res.sendStatus(200)`
- Check proxy middleware `onProxyRes` handler

## Files Changed

- ✅ `src/server.js` - Enhanced OPTIONS handlers
- ✅ `CORS-FIX-FINAL.md` - This documentation

---

**Status:** ✅ Fixes Applied, Ready for Deployment

**Next Steps:**
1. Deploy the changes
2. Test OPTIONS request
3. Test actual login from frontend
4. Verify no CORS errors in browser console

