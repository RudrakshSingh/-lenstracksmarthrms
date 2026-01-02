# API Error Status Documentation

## 📊 Current Status

### ✅ Working APIs (GET Requests)
- **Status**: Most GET APIs are working correctly
- **Examples**:
  - `GET /api/hr/employees` - ✅ Working
  - `GET /api/hr/departments` - ✅ Working
  - `GET /api/hr/stores` - ✅ Working
  - `GET /api/hr/employees/:id` - ✅ Working
  - `GET /api/attendance/records` - ✅ Working

### ❌ Failing APIs (POST/PUT/PATCH Requests)
- **Status**: POST, PUT, PATCH APIs returning 500 and 503 errors
- **Error Codes**:
  - `500 Internal Server Error` - Backend processing error
  - `503 Service Unavailable` - Backend not accessible or proxy issue

---

## 🔍 Error Analysis

### 500 Internal Server Error
**Meaning**: Backend received the request but encountered an error processing it.

**Common Causes**:
1. **Field validation errors** - Missing or invalid required fields
2. **Database connection issues** - MongoDB/Cosmos DB connection problems
3. **Service errors** - Internal logic errors in controllers/services
4. **Authentication/Authorization** - Token validation or permission issues
5. **Data transformation errors** - Field name mismatches or type mismatches

**Affected Endpoints** (Likely):
- `POST /api/hr/employees` - Create employee
- `POST /api/auth/register` - Register user
- `PUT /api/hr/employees/:id` - Update employee
- `PATCH /api/hr/employees/:id/status` - Update status
- `POST /api/hr/employees/:id/assign-role` - Assign role
- `POST /api/documents/upload` - Upload document

### 503 Service Unavailable
**Meaning**: Backend service is not accessible or Next.js proxy is failing.

**Common Causes**:
1. **Next.js API route not proxying** - Proxy route not configured correctly
2. **Backend service down** - HR service pod not running
3. **Network issues** - Connection timeout or network errors
4. **Ingress routing issues** - AKS ingress not routing correctly
5. **CORS issues** - Cross-origin request blocked

**Affected Endpoints** (Likely):
- Any POST/PUT/PATCH request through Next.js API routes
- Requests that require authentication
- File upload requests

---

## 🔄 Request Flow Analysis

### Working Flow (GET Requests)
```
Frontend → Next.js API Route → Backend (98.70.245.87) → Response ✅
```

### Failing Flow (POST Requests)
```
Frontend → Next.js API Route → ❌ 500/503 Error
```

**Possible Issues**:
1. Next.js API route not handling POST requests correctly
2. Backend receiving malformed requests
3. Backend service errors during processing
4. Proxy timeout or connection issues

---

## 📋 Specific API Endpoints Status

### Employee Management APIs

#### ✅ Working
- `GET /api/hr/employees` - List employees
- `GET /api/hr/employees/:id` - Get employee by ID
- `GET /api/hr/departments` - List departments
- `GET /api/hr/stores` - List stores

#### ❌ Failing (500/503)
- `POST /api/hr/employees` - Create employee
  - **Error**: 500 Internal Server Error
  - **Possible Cause**: Field validation, database connection, or service error
  
- `PUT /api/hr/employees/:id` - Update employee
  - **Error**: 500 Internal Server Error
  - **Possible Cause**: Statutory info transformation, CompensationProfile update
  
- `PATCH /api/hr/employees/:id/status` - Update status
  - **Error**: 500 Internal Server Error
  - **Possible Cause**: Employee lookup, status validation
  
- `POST /api/hr/employees/:id/assign-role` - Assign role
  - **Error**: 500 Internal Server Error
  - **Possible Cause**: Role lookup, employee update

### Authentication APIs

#### ❌ Failing (500/503)
- `POST /api/auth/register` - Register user
  - **Error**: 500 Internal Server Error or 503 Service Unavailable
  - **Possible Cause**: User creation, email validation, role assignment

### Document APIs

#### ❌ Failing (500/503)
- `POST /api/documents/upload` - Upload document
  - **Error**: 503 Service Unavailable
  - **Possible Cause**: Multipart form-data handling, file upload processing

---

## 🔍 Troubleshooting Guide

### For 500 Internal Server Error

1. **Check Backend Logs**:
   ```bash
   kubectl logs -n etelios-backend-prod hr-service-<pod-name> --tail=100
   ```

2. **Check Request Payload**:
   - Verify all required fields are present
   - Check field names match backend expectations
   - Verify data types (strings, numbers, dates)

3. **Check Database Connection**:
   - Verify MongoDB/Cosmos DB connection
   - Check database name is correct (not "test")
   - Verify network connectivity

4. **Check Authentication**:
   - Verify token is valid and not expired
   - Check user has required permissions
   - Verify Authorization header format

### For 503 Service Unavailable

1. **Check Next.js API Route**:
   - Verify proxy route exists (`app/api/[...proxy]/route.ts`)
   - Check route is handling POST/PUT/PATCH methods
   - Verify backend URL is correct (`98.70.245.87`)

2. **Check Backend Service Status**:
   ```bash
   kubectl get pods -n etelios-backend-prod | grep hr-service
   kubectl get deployment hr-service -n etelios-backend-prod
   ```

3. **Check Network Connectivity**:
   - Test backend health: `curl http://98.70.245.87/api/hr/health`
   - Verify ingress routing
   - Check firewall/network policies

4. **Check CORS Configuration**:
   - Verify CORS headers in backend
   - Check preflight OPTIONS requests

---

## 📊 Error Patterns

### Pattern 1: GET Works, POST Fails
**Indicates**: Next.js API route proxy issue or backend POST handler error

### Pattern 2: All POST APIs Fail with 503
**Indicates**: Next.js API route not configured for POST requests

### Pattern 3: Some POST APIs Fail with 500
**Indicates**: Backend validation or processing errors for specific endpoints

### Pattern 4: 503 on File Uploads
**Indicates**: Multipart form-data handling issue in proxy or backend

---

## 🔧 Recommended Fixes (For Reference)

### Fix 1: Next.js API Route Proxy
- Ensure catch-all route handles all HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Forward request body correctly
- Handle multipart/form-data for file uploads
- Forward Authorization header

### Fix 2: Backend Error Handling
- Add better error logging
- Return detailed error messages in development
- Validate request payload before processing
- Handle database connection errors gracefully

### Fix 3: Field Transformations
- Ensure frontend field names match backend expectations
- Transform snake_case to camelCase where needed
- Handle optional fields correctly

---

## 📝 Notes

- **No code changes made** - This is documentation only
- **Backend is deployed** - Latest fixes are live
- **Frontend needs fixes** - Next.js API route proxy configuration
- **GET APIs working** - Indicates basic connectivity is fine
- **POST APIs failing** - Indicates proxy or backend processing issues

---

## 🎯 Next Steps

1. **Check Backend Logs** - Identify specific error messages
2. **Test Backend Directly** - Bypass Next.js proxy to isolate issue
3. **Fix Next.js Proxy** - Ensure POST requests are proxied correctly
4. **Verify Field Mappings** - Ensure frontend sends correct field names
5. **Test Incrementally** - Fix one endpoint at a time

---

**Last Updated**: 2026-01-01
**Status**: Documentation Only - No Code Changes

