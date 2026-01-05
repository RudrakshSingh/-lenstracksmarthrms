# Employee Registration Endpoint - Complete Analysis

**Endpoint**: `POST /api/auth/register`  
**Date**: 2026-01-04

---

## 📍 Endpoint Locations

### 1. Auth Service (Primary)
- **File**: `microservices/auth-service/src/routes/auth.routes.js`
- **Route**: `POST /api/auth/register`
- **Controller**: `authController.register`
- **Service**: `authService.register`
- **Authentication**: ✅ **Required** (Admin or HR role)
- **Middleware**: `authenticate` → `requireRole(['admin', 'hr'])` → `validateRequest(registerSchema)`

### 2. HR Service (Alternative/Public)
- **File**: `microservices/hr-service/src/server.js` (Line 430)
- **Route**: `POST /api/auth/register`
- **Controller**: `onboardingController.register`
- **Service**: `onboardingService.registerBasicInfo`
- **Authentication**: ❌ **Not Required** (Public endpoint)
- **Middleware**: Only `validateRequest(registerSchema)`

---

## 📋 Request Fields - Auth Service (Primary)

### ✅ Required Fields

#### 1. `employee_id`
- **Type**: String
- **Required**: Yes
- **Max Length**: 20 characters
- **Format**: Alphanumeric
- **Example**: `"EMP-2026-866556"`
- **Validation**: `.required().trim().max(20)`

#### 2. `name`
- **Type**: String
- **Required**: Yes
- **Max Length**: 100 characters
- **Min Length**: 2 characters
- **Example**: `"John Doe"`
- **Validation**: `.required().trim().max(100)`

#### 3. `email`
- **Type**: String (Email)
- **Required**: Yes
- **Format**: Valid email address
- **Auto-converted**: Lowercase
- **Example**: `"john.doe@etelios.com"`
- **Validation**: `.email().required().trim().lowercase()`

#### 4. `phone`
- **Type**: String
- **Required**: Yes
- **Pattern**: `^\+?[\d\s-()]+$` (allows +, digits, spaces, hyphens, parentheses)
- **Example**: `"+91 98798 76543"` or `"+919879876543"`
- **Validation**: `.required().trim().pattern(/^\+?[\d\s-()]+$/)`

#### 5. `password`
- **Type**: String
- **Required**: Yes
- **Min Length**: 6 characters
- **Max Length**: 100 characters
- **Example**: `"Secure@123456"`
- **Validation**: `.required().min(6).max(100)`

#### 6. `role`
- **Type**: String (Enum)
- **Required**: Yes
- **Valid Values**: 
  - `"admin"`
  - `"hr"`
  - `"manager"`
  - `"employee"`
- **Example**: `"employee"`
- **Validation**: `.valid('admin', 'hr', 'manager', 'employee').required()`

#### 7. `department`
- **Type**: String
- **Required**: Yes
- **Max Length**: 100 characters
- **Example**: `"TECH"` or `"SALES"` or `"HR"`
- **Validation**: `.required().trim().max(100)`

#### 8. `designation`
- **Type**: String
- **Required**: Yes
- **Max Length**: 100 characters
- **Example**: `"Software Developer"` or `"HR Manager"`
- **Validation**: `.required().trim().max(100)`

#### 9. `joining_date`
- **Type**: Date
- **Required**: Yes
- **Format**: ISO 8601 date format
- **Example**: `"2026-01-02"` or `"2026-01-02T00:00:00.000Z"`
- **Validation**: `.date().required()`

---

### 🔹 Optional Fields

#### 10. `stores`
- **Type**: Array of MongoDB ObjectIds
- **Required**: No
- **Format**: Array of 24-character hex strings
- **Example**: `["507f1f77bcf86cd799439011", "507f191e810c19729de860ea"]`
- **Validation**: `.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).optional()`

#### 11. `reporting_manager`
- **Type**: MongoDB ObjectId
- **Required**: No
- **Format**: 24-character hex string
- **Example**: `"507f1f77bcf86cd799439011"`
- **Validation**: `.string().pattern(/^[0-9a-fA-F]{24}$/).optional()`

#### 12. `date_of_birth`
- **Type**: Date
- **Required**: No
- **Format**: ISO 8601 date format
- **Example**: `"1990-01-15"`
- **Validation**: `.date().optional()`

#### 13. `address`
- **Type**: Object
- **Required**: No
- **Fields**:
  - `street` (string, max 200)
  - `city` (string, max 100)
  - `state` (string, max 100)
  - `country` (string, max 100)
  - `pincode` (string, max 10)
- **Example**:
  ```json
  {
    "street": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "pincode": "400001"
  }
  ```
- **Validation**: `.object({...}).optional()`

#### 14. `emergency_contact`
- **Type**: Object
- **Required**: No
- **Fields**:
  - `name` (string, max 100)
  - `relationship` (string, max 50)
  - `phone` (string, pattern: `^\+?[\d\s-()]+$`)
- **Example**:
  ```json
  {
    "name": "Jane Doe",
    "relationship": "Spouse",
    "phone": "+91-9876543210"
  }
  ```
- **Validation**: `.object({...}).optional()`

---

## 📋 Request Fields - HR Service (Alternative)

### ✅ Required Fields

#### 1. `employee_id`
- **Type**: String
- **Required**: Yes
- **Example**: `"EMP-2026-866556"`
- **Validation**: `.required()`

#### 2. `name`
- **Type**: String
- **Required**: Yes
- **Min Length**: 2
- **Max Length**: 100
- **Example**: `"John Doe"`
- **Validation**: `.min(2).max(100).required()`

#### 3. `email`
- **Type**: String (Email)
- **Required**: Yes
- **Example**: `"john.doe@etelios.com"`
- **Validation**: `.email().required()`

#### 4. `phone`
- **Type**: String
- **Required**: Yes
- **Example**: `"+91-9876543210"`
- **Validation**: `.required()`

#### 5. `password`
- **Type**: String
- **Required**: Yes
- **Min Length**: 8 characters
- **Example**: `"Secure@123456"`
- **Validation**: `.min(8).required()`

#### 6. `role`
- **Type**: String (Enum)
- **Required**: No (defaults to 'employee')
- **Valid Values**: 
  - `"employee"`
  - `"hr"`
  - `"manager"`
  - `"admin"`
  - `"superadmin"`
- **Default**: `"employee"`
- **Example**: `"employee"`
- **Validation**: `.valid('employee', 'hr', 'manager', 'admin', 'superadmin').default('employee')`

#### 7. `address`
- **Type**: Object
- **Required**: Yes
- **Fields**:
  - `city` (required)
  - `state` (required)
  - `pincode` (required, pattern: `^\d{6}$`)
  - `address_line_1` (optional)
  - `street` (optional)
  - `zip` (optional)
  - `country` (default: 'India')
- **Example**:
  ```json
  {
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  }
  ```
- **Validation**: `.object({...}).required()`

---

## 🔍 Role Validation Process

### Auth Service Role Validation

**File**: `microservices/auth-service/src/services/auth.service.js` (Lines 73-100)

**Process**:
1. **Check if role exists in database** (Line 74):
   ```javascript
   let roleExists = await Role.findOne({ name: role.toLowerCase(), is_active: true });
   ```

2. **If not found, check inactive roles** (Line 77):
   ```javascript
   roleExists = await Role.findOne({ name: role.toLowerCase() });
   if (roleExists) {
     // Reactivate the role
     roleExists.is_active = true;
     await roleExists.save();
   }
   ```

3. **If still not found, check if role is valid** (Line 85):
   ```javascript
   const validRoles = ['admin', 'hr', 'manager', 'employee', 'superadmin', 'accountant', 'store_manager', 'sales', 'optometrist'];
   if (validRoles.includes(role.toLowerCase())) {
     // Auto-create the role
     roleExists = new Role({
       name: role.toLowerCase(),
       display_name: role.charAt(0).toUpperCase() + role.slice(1),
       description: `${role.charAt(0).toUpperCase() + role.slice(1)} role`,
       is_active: true,
       is_system: true
     });
     await roleExists.save();
   } else {
     throw new Error(`Invalid role specified: ${role}. Valid roles are: ${validRoles.join(', ')}`);
   }
   ```

**Valid Roles** (from auth.service.js):
- `'admin'`
- `'hr'`
- `'manager'`
- `'employee'`
- `'superadmin'`
- `'accountant'`
- `'store_manager'`
- `'sales'`
- `'optometrist'`

**Joi Validation** (from auth.routes.js):
- Only accepts: `'admin'`, `'hr'`, `'manager'`, `'employee'`
- ❌ **Does NOT accept**: `'superadmin'`, `'accountant'`, `'store_manager'`, `'sales'`, `'optometrist'`

---

### HR Service Role Validation

**File**: `microservices/hr-service/src/services/onboarding.service.js` (Lines 71-149)

**Process**:
1. **Validate against enum FIRST** (Line 72):
   ```javascript
   const validRoles = ['employee', 'hr', 'manager', 'admin', 'superadmin'];
   const normalizedRole = role.toLowerCase();
   
   if (!validRoles.includes(normalizedRole)) {
     throw new ApiError(httpStatus.BAD_REQUEST, `Invalid role specified: ${role}. Available roles: ${validRoles.join(', ')}`);
   }
   ```

2. **Lookup role in database** (Line 80):
   ```javascript
   let roleDoc = await Role.findByName(normalizedRole) || await Role.findOne({ name: normalizedRole });
   ```

3. **If not found, try to seed roles** (Line 84-88):
   ```javascript
   const { seedRoles } = require('../utils/seedRoles');
   await seedRoles();
   roleDoc = await Role.findByName(normalizedRole) || await Role.findOne({ name: normalizedRole });
   ```

4. **If still not found, check for inactive role** (Line 98-105):
   ```javascript
   const inactiveRole = await Role.findOne({ name: normalizedRole, is_active: false });
   if (inactiveRole) {
     inactiveRole.is_active = true;
     await inactiveRole.save();
     roleDoc = inactiveRole;
   }
   ```

5. **If still not found, auto-create role** (Line 109-132):
   ```javascript
   if (!roleDoc && validRoles.includes(normalizedRole)) {
     roleDoc = new Role({
       name: normalizedRole,
       display_name: normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1),
       description: `${normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)} role`,
       is_active: true,
       is_system: true,
       permissions: []
     });
     await roleDoc.save();
   }
   ```

**Valid Roles** (from onboarding.service.js):
- `'employee'`
- `'hr'`
- `'manager'`
- `'admin'`
- `'superadmin'`

**Joi Validation** (from hr-service server.js):
- Accepts: `'employee'`, `'hr'`, `'manager'`, `'admin'`, `'superadmin'`
- Default: `'employee'`

---

## 📊 Comparison: Auth Service vs HR Service

| Field | Auth Service | HR Service | Notes |
|-------|--------------|------------|-------|
| **Authentication** | ✅ Required (Admin/HR) | ❌ Not Required | Public endpoint |
| **employee_id** | ✅ Required (max 20) | ✅ Required | Same |
| **name** | ✅ Required (max 100) | ✅ Required (min 2, max 100) | HR service has min length |
| **email** | ✅ Required (email format) | ✅ Required (email format) | Same |
| **phone** | ✅ Required (pattern) | ✅ Required | HR service has additional validation |
| **password** | ✅ Required (min 6) | ✅ Required (min 8) | **Different min length** |
| **role** | ✅ Required (4 values) | Optional (5 values, default 'employee') | **Different valid values** |
| **department** | ✅ Required | ❌ Not in schema | **Missing in HR service** |
| **designation** | ✅ Required | ❌ Not in schema | **Missing in HR service** |
| **joining_date** | ✅ Required | ❌ Not in schema | **Missing in HR service** |
| **address** | Optional (object) | ✅ Required (object) | **Different requirement** |
| **stores** | Optional (array) | ❌ Not in schema | **Missing in HR service** |
| **reporting_manager** | Optional | ❌ Not in schema | **Missing in HR service** |
| **date_of_birth** | Optional | Optional | Same |
| **emergency_contact** | Optional | ❌ Not in schema | **Missing in HR service** |

---

## 🎯 Complete Request Format

### Auth Service Format (Recommended)
```json
POST /api/auth/register
Authorization: Bearer <admin-or-hr-token>
Content-Type: application/json

{
  "employee_id": "EMP-2026-866556",
  "name": "John Doe",
  "email": "john.doe@etelios.com",
  "phone": "+91-9876543210",
  "password": "Secure@123456",
  "role": "employee",
  "department": "TECH",
  "designation": "Software Developer",
  "joining_date": "2026-01-02",
  "stores": ["507f1f77bcf86cd799439011"],
  "reporting_manager": "507f191e810c19729de860ea",
  "date_of_birth": "1990-01-15",
  "address": {
    "street": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "pincode": "400001"
  },
  "emergency_contact": {
    "name": "Jane Doe",
    "relationship": "Spouse",
    "phone": "+91-9876543210"
  }
}
```

### HR Service Format (Alternative)
```json
POST /api/auth/register
Content-Type: application/json

{
  "employee_id": "EMP-2026-866556",
  "name": "John Doe",
  "email": "john.doe@etelios.com",
  "phone": "+91-9876543210",
  "password": "Secure@123456",
  "role": "employee",
  "date_of_birth": "1990-01-15",
  "address": {
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  }
}
```

---

## 🔍 Role Validation Summary

### Auth Service
1. **Joi Validation**: Only accepts `'admin'`, `'hr'`, `'manager'`, `'employee'`
2. **Service Validation**: Accepts 9 roles (including superadmin, accountant, etc.)
3. **Auto-creation**: ✅ Yes - Creates role if valid and doesn't exist
4. **Case handling**: Converts to lowercase

### HR Service
1. **Joi Validation**: Accepts `'employee'`, `'hr'`, `'manager'`, `'admin'`, `'superadmin'`
2. **Service Validation**: Same 5 roles
3. **Auto-creation**: ✅ Yes - Creates role if valid and doesn't exist
4. **Case handling**: Converts to lowercase
5. **Role seeding**: Tries to seed all roles first, then creates if missing

---

## ⚠️ Important Notes

1. **Two Different Implementations**: There are TWO different `/api/auth/register` endpoints:
   - Auth Service: Requires authentication, more fields
   - HR Service: Public endpoint, fewer fields

2. **Role Validation Mismatch**:
   - Auth Service Joi: Only 4 roles
   - Auth Service Logic: 9 roles
   - HR Service: 5 roles

3. **Password Length**:
   - Auth Service: Min 6 characters
   - HR Service: Min 8 characters

4. **Required Fields Difference**:
   - Auth Service requires: `department`, `designation`, `joining_date`
   - HR Service requires: `address` (with city, state, pincode)

---

## ✅ Recommended Request Format

For **Auth Service** (if using authenticated endpoint):
```json
{
  "employee_id": "EMP-2026-866556",
  "name": "John Doe",
  "email": "john.doe@etelios.com",
  "phone": "+91-9876543210",
  "password": "Secure@123456",
  "role": "employee",
  "department": "TECH",
  "designation": "Software Developer",
  "joining_date": "2026-01-02"
}
```

For **HR Service** (if using public endpoint):
```json
{
  "employee_id": "EMP-2026-866556",
  "name": "John Doe",
  "email": "john.doe@etelios.com",
  "phone": "+91-9876543210",
  "password": "Secure@123456",
  "role": "employee",
  "address": {
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  }
}
```

---

**Last Updated**: 2026-01-04

