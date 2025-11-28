# Login 500 Error - Root Cause Identified

## The Problem

The login endpoint is returning a **500 Internal Server Error** because:

### **Root Cause: Password Field Not Selected**

The `User.findOne()` query in the login method is **NOT selecting the password field**. When `user.comparePassword(password)` is called, the `user.password` field is `undefined`, causing `bcrypt.compare()` to fail with an error that gets caught and results in a 500 error.

## The Fix

### 1. Add `.select('+password')` to User Queries

**Before (BROKEN):**
```javascript
user = await User.findOne({ email: emailOrEmployeeId.toLowerCase() })
  .populate('stores', 'name code')
  .populate('reporting_manager', 'name employee_id');
```

**After (FIXED):**
```javascript
user = await User.findOne({ email: emailOrEmployeeId.toLowerCase() })
  .select('+password') // CRITICAL: Select password field for comparison
  .maxTimeMS(5000) // 5 second timeout
  .populate('stores', 'name code')
  .populate('reporting_manager', 'name employee_id');
```

### 2. Add Database Connection Check

Check if database is connected before querying:
```javascript
const mongoose = require('mongoose');
if (mongoose.connection.readyState !== 1) {
  throw new Error('Database connection unavailable. Please try again later.');
}
```

### 3. Add Password Field Validation

Before calling `comparePassword()`, verify the password field exists:
```javascript
if (!user.password) {
  throw new Error('Authentication error. Please contact support.');
}
```

### 4. Improved Error Handling

Distinguish between:
- **Database errors** → Return 503 (Service Unavailable)
- **Authentication errors** → Return 400 (Bad Request)
- **Unexpected errors** → Return 500 (Internal Server Error)

## Why This Happens

In Mongoose, if a field is marked as `select: false` in the schema (or excluded by default), you must explicitly use `.select('+fieldName')` to include it in the query result. The password field is likely excluded by default for security reasons, so it needs to be explicitly selected for login operations.

## Testing

After deployment, test with:

```bash
curl -X POST https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrEmployeeId": "test@example.com",
    "password": "testpassword"
  }'
```

**Expected Results:**

✅ **If user exists and password is correct:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

✅ **If user doesn't exist or password is wrong:**
```json
{
  "success": false,
  "message": "Invalid email or password",
  "service": "auth-service"
}
```

✅ **If database is not connected:**
```json
{
  "success": false,
  "message": "Service temporarily unavailable. Please try again later.",
  "error": "Database connection error",
  "service": "auth-service"
}
```

## Status

✅ **Code Fixed** - Password field selection added
✅ **Database Connection Check** - Added
✅ **Error Handling** - Improved
⏳ **Waiting for Deployment** - Changes need to be deployed to Azure

---

**Next Steps:**
1. Deploy the updated code to Azure
2. Restart the auth service
3. Test the login endpoint
4. Monitor logs for any remaining issues

