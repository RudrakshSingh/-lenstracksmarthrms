# Tenant Registry Service - Update Plan

## Current Status

### ✅ What's Already Implemented:
1. **Endpoint**: `POST /api/tenants` ✅
2. **Subdomain support** ✅
3. **Configuration** (timezone, currency, language, dateFormat) ✅
4. **Branding** ✅
5. **Features array** ✅
6. **Usage tracking** ✅
7. **Limits** ✅

### ❌ What's Missing (from documentation):
1. **Admin user creation** - Not implemented
2. **Contact fields** - Missing (primaryContact, primaryEmail, primaryPhone, billingContact, etc.)
3. **Email/Phone fields** - Missing (only has tenantName, domain, subdomain)
4. **Address fields** - Missing
5. **Plan details** - Missing (price, billing cycle, features list)
6. **Subscription details** - Missing (renewalDate, autoRenewal, paymentStatus)
7. **Modules array** - Has features but not modules
8. **Authentication middleware** - Routes don't require auth
9. **Response format** - Doesn't match documentation

---

## Required Updates

### 1. Update Tenant Model
**File**: `microservices/tenant-registry-service/src/models/Tenant.model.js`

**Add Fields:**
- `email` (string, required)
- `phone` (string, optional)
- `address` (object with street, city, state, country, pincode)
- `contact` (object with primaryContact, primaryEmail, primaryPhone, billingContact, billingEmail, technicalContact, technicalEmail)
- `modules` (array of strings - separate from features)
- `planDetails` (object with name, price, currency, billing, features)
- `subscription` (object with startDate, endDate, renewalDate, autoRenewal, paymentStatus)
- `adminUser` (object with userId, email)

### 2. Update Controller
**File**: `microservices/tenant-registry-service/src/controllers/tenant.controller.js`

**Changes:**
- Add authentication middleware
- Add admin user creation logic
- Update validation schema to match documentation
- Update response format to match documentation
- Add plan details calculation
- Add subscription setup

### 3. Update Routes
**File**: `microservices/tenant-registry-service/src/routes/tenant.routes.js`

**Changes:**
- Add authentication middleware
- Add role check (superadmin)
- Add module assignment endpoint

### 4. Add Admin User Service
**New File**: `microservices/tenant-registry-service/src/services/adminUser.service.js`

**Purpose:**
- Create admin user via auth service
- Link admin user to tenant
- Return admin user info

---

## Implementation Steps

1. ✅ Update Tenant Model with missing fields
2. ✅ Update validation schema in controller
3. ✅ Add authentication middleware to routes
4. ✅ Implement admin user creation
5. ✅ Update response format
6. ✅ Add plan details calculation
7. ✅ Add subscription setup
8. ✅ Add module assignment endpoint

---

## Endpoint Mapping

**Documentation Endpoint**: `POST /api/admin/tenants`
**Current Endpoint**: `POST /api/tenants`

**Solution**: 
- Option 1: Add `/api/admin/tenants` route that forwards to tenant-registry-service
- Option 2: Update frontend to use `/api/tenants` directly
- Option 3: Add both routes (recommended)

---

## Next Steps

1. Update Tenant Model
2. Update Controller
3. Update Routes
4. Add Admin User Service
5. Test with frontend

