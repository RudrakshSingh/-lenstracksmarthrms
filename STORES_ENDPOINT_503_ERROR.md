# Stores Endpoint 503 Error Analysis

**Date**: 2026-01-02  
**Issue**: Frontend getting 503 Service Unavailable for `/api/hr/stores`

---

## 🔍 Error Details

### Frontend Logs
```
GET http://localhost:3002/api/hr/stores?limit=200&page=1 503 (Service Unavailable)
hasAuth: false
authTokenPreview: 'none'
Note: 'Token in HttpOnly cookie - server will read from cookies'
```

### Backend Test Results
- **Without Auth**: Returns 401 "Access token required" ✅
- **With Auth Token**: Returns 200 with empty array ✅

---

## 🔍 Root Cause Analysis

### Issue Identified
The frontend is **not sending the authentication token** in the request:
- `hasAuth: false`
- `authTokenPreview: 'none'`
- Frontend expects token to be in HttpOnly cookie, but server might not be reading it

### Why 503 Instead of 401?

The endpoint requires authentication:
```javascript
router.get('/stores',
  authenticate,  // Requires auth token
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['store:read']),
  asyncHandler(getStores)
);
```

**Possible reasons for 503:**
1. **Authentication middleware failing** - If auth middleware throws an error instead of returning 401
2. **Service unavailable** - The `getStores` controller catches errors with "unavailable" and returns 503
3. **Database/Model issue** - Store model might not be loaded or database connection issue

---

## ✅ Verification

### Test Results
- ✅ Endpoint exists: `/api/hr/stores` in `hr.routes.js`
- ✅ Controller exists: `getStores` in `hrController.js`
- ✅ Service method exists: `getStores` in `hr.service.js`
- ✅ With auth token: Works correctly (returns 200)
- ❌ Without auth token: Should return 401, but frontend getting 503

---

## 🔧 Possible Fixes

### 1. Frontend Issue (Most Likely)
**Problem**: Frontend not sending auth token properly

**Solution**: 
- Ensure token is being sent in `Authorization` header
- Check if HttpOnly cookie is being read by backend
- Verify token is not expired

### 2. Authentication Middleware Issue
**Problem**: Auth middleware might be throwing error instead of returning 401

**Check**: 
- Verify `authenticate` middleware handles missing tokens correctly
- Ensure it returns 401, not 503

### 3. Service Layer Issue
**Problem**: `getStores` service method might be throwing "unavailable" error

**Check**:
- Verify Store model is imported correctly
- Check database connection
- Verify Store collection exists

---

## 📋 Quick Fix Checklist

- [ ] Verify frontend is sending `Authorization: Bearer <token>` header
- [ ] Check if HttpOnly cookie authentication is working
- [ ] Verify auth middleware returns 401 for missing tokens (not 503)
- [ ] Check Store model import in `hr.service.js`
- [ ] Verify database connection for Store collection

---

## 🧪 Test Commands

### Test Without Auth (Should return 401)
```bash
curl -k "https://98.70.245.87/api/hr/stores?limit=200&page=1" \
  -H "Host: api.etelios.com"
```

### Test With Auth (Should return 200)
```bash
curl -k "https://98.70.245.87/api/hr/stores?limit=200&page=1" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <token>"
```

---

## 💡 Most Likely Cause

**Frontend is not sending the authentication token properly.**

The frontend logs show:
- `hasAuth: false`
- `authTokenPreview: 'none'`
- Expects token in HttpOnly cookie

**Solution**: Ensure frontend sends `Authorization: Bearer <token>` header, or verify backend can read HttpOnly cookies.

---

**Status**: 🔍 **Analysis Complete - Frontend Auth Issue**

