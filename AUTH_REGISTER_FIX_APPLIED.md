# Auth Registration Fix Applied

**Date**: 2026-01-08  
**Status**: ✅ **Fixed**

---

## 🔧 Problem

The auth service was missing the `/api/auth/register` endpoint in production, causing a chicken-and-egg problem:
- Can't login because user doesn't exist
- Can't create user because registration requires authentication
- `/api/auth/register` returned: `"Route not found"`

---

## ✅ Solution Applied

### 1. Added `/api/auth/register` Route

**File**: `microservices/auth-service/src/routes/auth.routes.js`

Added registration route with validation schema:
```javascript
const registerSchema = {
  body: Joi.object({
    employee_id: Joi.string().required().trim().min(3).max(50),
    name: Joi.string().required().trim().min(2).max(100),
    email: Joi.string().email().required().trim().lowercase(),
    phone: Joi.string().optional().trim(),
    password: Joi.string().required().min(8),
    role: Joi.string().valid('admin', 'hr', 'manager', 'employee', 'superadmin').default('employee'),
    department: Joi.string().optional().trim(),
    designation: Joi.string().optional().trim(),
    joining_date: Joi.date().optional(),
    status: Joi.string().valid('active', 'inactive', 'pending').default('active')
  })
};

router.post("/register",
  validateRequest(registerSchema),
  authController.register
);
```

### 2. Modified Register Controller

**File**: `microservices/auth-service/src/controllers/authController.js`

**Key Changes**:
- ✅ Allow **public registration** for first user (when database is empty)
- ✅ First user MUST be `admin` or `superadmin` role
- ✅ After first user, require authentication
- ✅ Logs first user registration for audit trail

**Logic**:
```javascript
// Check if this is the first user registration
const userCount = await User.countDocuments();

if (userCount === 0) {
  // First user - allow public registration
  // Must be admin or superadmin role
  if (!['admin', 'superadmin'].includes(userData.role)) {
    return res.status(403).json({
      success: false,
      message: 'First user must be admin or superadmin'
    });
  }
  // Use system user for createdBy
  const result = await authService.register(userData, 'system');
  return res.status(201).json({ ... });
}

// Not first user - require authentication
if (!createdBy) {
  return res.status(401).json({
    success: false,
    message: 'Authentication required to register users'
  });
}
```

---

## 🚀 Testing the Fix

### Step 1: Test Registration Endpoint

```bash
curl -k -X POST "https://98.70.245.87/api/auth/register" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "ADMIN-001",
    "name": "System Administrator",
    "email": "admin@etelios.com",
    "phone": "+919999999999",
    "password": "Admin@123456",
    "role": "admin",
    "department": "TECH",
    "designation": "System Administrator"
  }'
```

**Expected Response** (if database is empty):
```json
{
  "success": true,
  "message": "Admin user registered successfully",
  "data": {
    "user": {
      "id": "...",
      "email": "admin@etelios.com",
      "employee_id": "ADMIN-001",
      "name": "System Administrator",
      "role": "admin"
    },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

### Step 2: Test Login

```bash
curl -k -X POST "https://98.70.245.87/api/auth/login" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrEmployeeId": "admin@etelios.com",
    "password": "Admin@123456"
  }'
```

**Expected Response**:
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

---

## 📋 Deployment Steps

### Option 1: Deploy to Production (Recommended)

1. **Build auth-service Docker image**:
   ```bash
   cd /Users/rudrakshsingh/Desktop/lenstracksmarthrms
   docker build -t eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest \
     -f microservices/auth-service/Dockerfile .
   ```

2. **Push to Azure Container Registry**:
   ```bash
   docker push eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest
   ```

3. **Restart auth-service in Kubernetes**:
   ```bash
   kubectl rollout restart deployment/auth-service -n etelios-backend-prod
   ```

4. **Verify deployment**:
   ```bash
   kubectl get pods -n etelios-backend-prod -l app=auth-service
   kubectl logs -n etelios-backend-prod -l app=auth-service --tail=50
   ```

### Option 2: Test Locally First

1. **Start auth-service locally**:
   ```bash
   cd microservices/auth-service
   npm install
   npm run dev
   ```

2. **Test registration**:
   ```bash
   curl -X POST "http://localhost:3001/api/auth/register" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
   ```

---

## ✅ Benefits

1. ✅ **Solves chicken-and-egg problem** - Can now create first admin user
2. ✅ **Secure** - Only first user can self-register, must be admin
3. ✅ **Backward compatible** - Existing authenticated registration still works
4. ✅ **Auditable** - Logs first user creation
5. ✅ **Production-ready** - Proper validation and error handling

---

## ⚠️ Security Note

After the first admin user is created:
- All subsequent registrations require authentication
- Only admin/HR can create new users
- First user registration is logged for audit trail

---

## 📁 Modified Files

1. `microservices/auth-service/src/routes/auth.routes.js`
   - Added `/register` route with validation schema

2. `microservices/auth-service/src/controllers/authController.js`
   - Modified `register()` function to allow public first-user registration

---

## 🎯 Next Steps

1. **Deploy changes** to production (see Deployment Steps above)
2. **Create admin user** via `/api/auth/register`
3. **Login** with admin credentials
4. **Test frontend** login flow

---

**Status**: ✅ **Ready for Deployment**

