# Register Endpoint Authentication Issue

## Problem Identified

The `/api/auth/register` endpoint is failing with 401 "Authentication required to register users" even when a valid token is sent.

## Root Cause

The `optionalAuthenticate` middleware in `microservices/auth-service/src/routes/auth.routes.js` (lines 11-24) has a **JWT_SECRET mismatch**:

```javascript
const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      // ❌ PROBLEM: Uses wrong JWT_SECRET or fallback
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
      const User = require("../models/User.model");
      req.user = await User.findById(decoded.userId).select('-password');
    }
  } catch (error) {
    // ❌ PROBLEM: Silently catches error, req.user stays undefined
  }
  next();
};
```

### What's Happening:

1. **Token is created with**: `JWT_SECRET = 'etelios-dev-secret-key-2024'` (from `jwt.js`)
2. **Token is verified with**: `process.env.JWT_SECRET || 'fallback-secret-key'` (from `routes.js`)
3. **Result**: Token verification fails with "invalid signature"
4. **Error is silently caught**: `req.user` is never set
5. **Register controller checks**: `req.user?._id || req.user?.id` → undefined → returns 401

## Test Results

```
Token verification with 'fallback-secret-key': ❌ FAILED (invalid signature)
Token verification with correct secret + issuer/audience: ✅ SUCCESS
Register endpoint with valid token: ❌ 401 (req.user not set)
```

## What Backend Needs

The `optionalAuthenticate` in `auth.routes.js` should:

1. **Use the same JWT_SECRET** as token generation (from `jwt.js`)
2. **Use `verifyAccessToken`** instead of `jwt.verify` directly (handles issuer/audience)
3. **OR** import and use the `optionalAuthenticate` from `auth.middleware.js` (which uses `verifyAccessToken`)

### Current Implementation (BROKEN):
```javascript
// auth.routes.js - LOCAL optionalAuthenticate
const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
```

### Should Be (FIXED):
```javascript
// Option 1: Use verifyAccessToken
const { verifyAccessToken } = require('../config/jwt');
const decoded = verifyAccessToken(token);

// Option 2: Use middleware from auth.middleware.js
const { optionalAuthenticate } = require('../middleware/auth.middleware');
// Then use it in route instead of local implementation
```

## What Script Needs

The script is **correct** - it's sending:
- ✅ Valid JWT token in `Authorization: Bearer <token>` header
- ✅ Correct `x-tenant-id` header
- ✅ All required fields in request body

The issue is **100% on the backend** - the `optionalAuthenticate` middleware is using the wrong JWT_SECRET.

## Workaround

Since `createEmployee` endpoint works (uses proper `authenticate` middleware), the script uses it as fallback. This is acceptable for now, but the backend should fix `optionalAuthenticate` to use the correct JWT_SECRET.

## Backend Fix Required

**File**: `microservices/auth-service/src/routes/auth.routes.js`

**Change**:
```javascript
// BEFORE (BROKEN):
const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
      const User = require("../models/User.model");
      req.user = await User.findById(decoded.userId).select('-password');
    }
  } catch (error) {
    // Silently fail
  }
  next();
};

// AFTER (FIXED):
const { verifyAccessToken } = require('../config/jwt');
const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = verifyAccessToken(token); // ✅ Uses correct secret + issuer/audience
      const User = require("../models/User.model");
      req.user = await User.findById(decoded.userId).select('-password');
    }
  } catch (error) {
    // Silently fail (optional auth)
  }
  next();
};
```

**OR** use the existing middleware:
```javascript
// Remove local optionalAuthenticate and use:
const { optionalAuthenticate } = require('../middleware/auth.middleware');
```
