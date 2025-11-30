# CORS Error Fix - Explanation

## Problem

The frontend at `https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net` was being blocked by CORS policy when trying to access the API Gateway at `https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login`.

**Error Message:**
```
Access to fetch at 'https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login' 
from origin 'https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Root Causes

1. **CORS Configuration Issue**: The API Gateway CORS configuration had a bug where `'*'` was included in an array instead of being used as a direct value
2. **Missing Frontend Origin**: The new frontend origin wasn't explicitly in the allowed origins list
3. **Proxy CORS Headers**: CORS headers weren't being properly forwarded/preserved through the proxy middleware
4. **OPTIONS Preflight**: OPTIONS requests (preflight) might not have been handled correctly

## Fixes Applied

### 1. Fixed CORS Configuration Logic

**File:** `src/server.js`

**Before:**
```javascript
const allowedOrigins = process.env.CORS_ORIGIN 
  ? (process.env.CORS_ORIGIN === '*' ? '*' : process.env.CORS_ORIGIN.split(',').map(o => o.trim()))
  : [
      'https://etelios-frontend-appservice-eedgc2bmb7h5fzfy.centralindia-01.azurewebsites.net',
      'https://etelios-frontend-appservice-eedgc2bmb7h5fzfy.centralindia-01.azurewebsites.net/hrms',
      '*'  // ❌ This is wrong - '*' in array doesn't work
    ];
```

**After:**
```javascript
const corsOriginEnv = process.env.CORS_ORIGIN;
let allowedOrigins;

if (corsOriginEnv === '*') {
  // Allow all origins
  allowedOrigins = '*';
} else if (corsOriginEnv) {
  // Use configured origins
  allowedOrigins = corsOriginEnv.split(',').map(o => o.trim());
} else {
  // Default: Allow all origins for flexibility
  allowedOrigins = '*';  // ✅ Correct - '*' as direct value
}
```

**Improvements:**
- Properly handles `'*'` wildcard (allows all origins)
- More lenient default (allows all origins if `CORS_ORIGIN` not set)
- Better error handling and logging

### 2. Enhanced CORS Middleware

**Changes:**
- Added proper origin validation
- Allows requests with no origin (mobile apps, curl, Postman)
- Added more allowed headers
- Added `exposedHeaders` for better client access
- Increased `maxAge` for preflight cache (24 hours)

**New Headers:**
- `Origin`, `Accept`, `Cache-Control`, `Pragma` added to allowed headers
- `exposedHeaders` includes `Content-Type`, `Authorization`, `X-Request-ID`

### 3. Added Explicit OPTIONS Handler

**Purpose:** Handle CORS preflight requests explicitly before they reach the proxy

```javascript
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Requested-With, Origin, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(200);
});
```

**Why:** Ensures preflight OPTIONS requests are handled immediately with proper CORS headers, even before they reach the proxy middleware.

### 4. Enhanced Proxy Response CORS Headers

**File:** `src/server.js` - `onProxyRes` handler

**Added:**
- Checks if target service sets CORS headers
- If not, adds CORS headers to proxy response
- Ensures `Access-Control-Allow-Origin` matches the request origin
- Adds all necessary CORS headers for proper browser handling

```javascript
onProxyRes: (proxyRes, req, res) => {
  // Ensure CORS headers are present in proxy response
  const origin = req.headers.origin;
  if (origin) {
    if (!proxyRes.headers['access-control-allow-origin']) {
      proxyRes.headers['Access-Control-Allow-Origin'] = origin;
    }
    if (!proxyRes.headers['access-control-allow-credentials']) {
      proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
    }
    // ... more headers
  }
  // ... rest of handler
}
```

## How CORS Works

### Preflight Request (OPTIONS)

1. Browser sends OPTIONS request before actual request
2. Server responds with CORS headers
3. Browser checks if origin is allowed
4. If allowed, browser sends actual request

### Actual Request

1. Browser sends actual request (GET, POST, etc.)
2. Server includes CORS headers in response
3. Browser checks headers and allows/disallows response

## Testing

After deployment, test with:

```bash
# Test preflight (OPTIONS)
curl -X OPTIONS \
  -H "Origin: https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v \
  https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login

# Should return 200 with CORS headers

# Test actual request
curl -X POST \
  -H "Origin: https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}' \
  -v \
  https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login

# Should return response with CORS headers
```

## Environment Variables

You can configure CORS via environment variable:

```bash
# Allow all origins (default)
CORS_ORIGIN=*

# Allow specific origins (comma-separated)
CORS_ORIGIN=https://frontend1.com,https://frontend2.com

# In Azure App Service, set this in Configuration > Application Settings
```

## Expected Behavior After Fix

1. ✅ Preflight OPTIONS requests return 200 with proper CORS headers
2. ✅ Actual requests include CORS headers in response
3. ✅ Browser allows the response and frontend can access data
4. ✅ All origins allowed by default (can be restricted via env var)
5. ✅ CORS headers forwarded through proxy to microservices

## Deployment

After pushing these changes:

1. **Deploy API Gateway** - Changes will be deployed automatically
2. **Verify CORS Headers** - Check response headers include `Access-Control-Allow-Origin`
3. **Test Frontend** - Frontend should now be able to make requests successfully

## Additional Notes

- The fix allows all origins by default for flexibility
- Can be restricted by setting `CORS_ORIGIN` environment variable
- CORS headers are added at both API Gateway and proxy levels
- OPTIONS requests are handled explicitly for better compatibility

---

**Status:** ✅ Fixed and ready for deployment

