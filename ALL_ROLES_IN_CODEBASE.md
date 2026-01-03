# All Roles Assigned in Codebase

**Date**: 2026-01-02  
**Comprehensive list of all roles defined and used in the HRMS system**

---

## 📋 Core Roles (Defined in Role Models)

### 1. **Primary Roles** (In Role Model Enum)

These are the **main roles** defined in the database schema:

#### HR Service Role Model
**File**: `microservices/hr-service/src/models/Role.model.js` (line 10)
```javascript
enum: ['superadmin', 'admin', 'hr', 'manager', 'employee']
```

#### Auth Service Role Model
**File**: `microservices/auth-service/src/models/Role.model.js` (line 10)
```javascript
enum: ['superadmin', 'admin', 'hr', 'manager', 'employee']
```

**Core Roles:**
1. ✅ **`superadmin`** - Super Administrator
   - Display Name: "Super Administrator"
   - Description: "Highest level access with all system permissions"
   - Has ALL permissions

2. ✅ **`admin`** - Administrator
   - Display Name: "Administrator"
   - Description: "Full system access with all permissions"
   - Has most permissions (similar to superadmin)

3. ✅ **`hr`** - Human Resources
   - Display Name: "Human Resources" / "HR"
   - Description: "HR management with user and attendance oversight"
   - HR-specific permissions

4. ✅ **`manager`** - Manager
   - Display Name: "Manager"
   - Description: "Team management with limited administrative access"
   - Team management permissions

5. ✅ **`employee`** - Employee
   - Display Name: "Employee"
   - Description: "Basic employee access for personal data and attendance"
   - Basic read permissions

---

## 📋 Extended Roles (Mentioned in Code)

### 2. **Additional Roles** (Used in Validation/Service Logic)

These roles are **not in the Role model enum** but are **validated/used** in various services:

#### Auth Service - Valid Roles
**File**: `microservices/auth-service/src/services/auth.service.js` (line 85)
```javascript
const validRoles = ['admin', 'hr', 'manager', 'employee', 'superadmin', 'accountant', 'store_manager', 'sales', 'optometrist'];
```

**Extended Roles:**
6. ⚠️ **`accountant`** - Accountant
   - Used in: Payroll routes, Statutory routes
   - **Status**: Used in code but NOT in Role model enum
   - **Location**: `microservices/hr-service/src/routes/payroll.routes.js`, `statutory.routes.js`

7. ⚠️ **`store_manager`** - Store Manager
   - Used in: Auth service validation
   - **Status**: Used in code but NOT in Role model enum
   - **Location**: `microservices/auth-service/src/services/auth.service.js`

8. ⚠️ **`sales`** - Sales
   - Used in: Auth service validation
   - **Status**: Used in code but NOT in Role model enum
   - **Location**: `microservices/auth-service/src/services/auth.service.js`

9. ⚠️ **`optometrist`** - Optometrist
   - Used in: Auth service validation
   - **Status**: Used in code but NOT in Role model enum
   - **Location**: `microservices/auth-service/src/services/auth.service.js`

---

## 📋 Role Variations (Case Sensitivity)

### 3. **Case Variations** (Accepted in Different Endpoints)

The codebase accepts **both uppercase and lowercase** variations:

#### HR Routes
**File**: `microservices/hr-service/src/routes/hr.routes.js` (line 39)
```javascript
roleName: Joi.string().valid('SuperAdmin', 'Admin', 'HR', 'Manager', 'Employee', 'hr', 'admin', 'superadmin', 'manager', 'employee')
```

**Accepted Variations:**
- `SuperAdmin` / `superadmin`
- `Admin` / `admin`
- `HR` / `hr`
- `Manager` / `manager`
- `Employee` / `employee`

#### Onboarding Routes
**File**: `microservices/hr-service/src/routes/onboarding.routes.js` (line 18, 122)
```javascript
role: Joi.string().valid('employee', 'hr', 'manager', 'admin', 'superadmin')
```

#### Auth Routes
**File**: `microservices/auth-service/src/routes/auth.routes.js` (line 18, 50)
```javascript
role: Joi.string().valid('admin', 'hr', 'manager', 'employee')  // Login
role: Joi.string().valid('admin', 'hr', 'manager', 'employee', 'superadmin')  // Register
```

---

## 📋 Role Usage in Routes

### 4. **Role-Based Access Control (RBAC) Usage**

#### HR Service Routes

**Employee Management:**
- `requireRole(['HR', 'Admin', 'SuperAdmin'])` - Create/Update/Delete employees
- `requireRole(['HR', 'Admin', 'SuperAdmin', 'hr', 'admin', 'superadmin'])` - Read employees
- `requireRole(['HR', 'Admin', 'SuperAdmin'])` - Assign roles, Update status

**Department Management:**
- `requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'])` - Read departments
- `requireRole(['Admin', 'SuperAdmin'])` - Create/Update/Delete departments

**Store Management:**
- `requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'])` - Read stores
- `requireRole(['HR', 'Admin', 'SuperAdmin'])` - Create/Update/Delete stores

**Onboarding:**
- `requireRole(['hr', 'admin', 'superadmin'])` - All onboarding endpoints

**Payroll:**
- `requireRole(['hr', 'admin', 'accountant'])` - Payroll management
- `requireRole(['hr', 'admin', 'accountant', 'manager', 'employee'])` - View payroll

**Statutory:**
- `requireRole(['hr', 'admin', 'accountant'])` - Statutory management
- `requireRole(['hr', 'admin', 'accountant', 'employee'])` - View statutory info

**Leave Management:**
- `requireRole(['hr', 'admin', 'manager', 'employee'])` - Leave operations
- `requireRole(['hr', 'admin', 'manager'])` - Approve leaves

**Attendance:**
- `requireRole(['hr', 'admin', 'manager'])` - Attendance management
- `requireRole([], ['attendance:record'])` - Record attendance (any authenticated user)

**Time Tracking:**
- `requireRole(['hr', 'admin', 'manager', 'employee'])` - Time tracking

**Performance:**
- `requireRole(['hr', 'admin', 'manager', 'employee'])` - Performance reviews
- `requireRole(['hr', 'admin', 'manager'])` - Approve reviews

**Training:**
- `requireRole(['hr', 'admin', 'manager', 'employee'])` - View training
- `requireRole(['hr', 'admin'])` - Create/Manage training

**Benefits:**
- `requireRole(['hr', 'admin', 'manager', 'employee'])` - View benefits
- `requireRole(['hr', 'admin'])` - Manage benefits

**Recruitment:**
- `requireRole(['hr', 'admin', 'manager'])` - Recruitment management

**Roster:**
- `requireRole(['hr', 'admin', 'manager'])` - Roster management
- `requireRole(['hr', 'admin'])` - Approve roster

**Incentive:**
- `requireRole(['hr', 'admin', 'manager'])` - Incentive management
- `requireRole(['hr', 'admin', 'accountant'])` - Approve incentives
- `requireRole(['hr', 'admin', 'manager', 'employee'])` - View incentives

---

## 📋 Summary Table

| Role Name | In Model Enum? | Used in Routes? | Case Variations | Status |
|-----------|----------------|-----------------|-----------------|--------|
| `superadmin` | ✅ Yes | ✅ Yes | SuperAdmin, superadmin | ✅ Active |
| `admin` | ✅ Yes | ✅ Yes | Admin, admin | ✅ Active |
| `hr` | ✅ Yes | ✅ Yes | HR, hr | ✅ Active |
| `manager` | ✅ Yes | ✅ Yes | Manager, manager | ✅ Active |
| `employee` | ✅ Yes | ✅ Yes | Employee, employee | ✅ Active |
| `accountant` | ❌ No | ✅ Yes | - | ⚠️ Used but not in enum |
| `store_manager` | ❌ No | ⚠️ Limited | - | ⚠️ Used but not in enum |
| `sales` | ❌ No | ⚠️ Limited | - | ⚠️ Used but not in enum |
| `optometrist` | ❌ No | ⚠️ Limited | - | ⚠️ Used but not in enum |

---

## 🔍 Key Findings

### ✅ **Consistent Roles** (5 roles)
These are properly defined in Role models and widely used:
1. `superadmin`
2. `admin`
3. `hr`
4. `manager`
5. `employee`

### ⚠️ **Inconsistent Roles** (4 roles)
These are used in code but **NOT** in Role model enum:
1. `accountant` - Used in payroll/statutory routes
2. `store_manager` - Mentioned in auth service
3. `sales` - Mentioned in auth service
4. `optometrist` - Mentioned in auth service

### 🔧 **Recommendations**

1. **Add missing roles to Role model enum:**
   ```javascript
   // In both hr-service and auth-service Role models
   enum: ['superadmin', 'admin', 'hr', 'manager', 'employee', 'accountant', 'store_manager', 'sales', 'optometrist']
   ```

2. **Standardize case handling:**
   - Use lowercase in database (already done)
   - Accept both cases in validation (already done)
   - Normalize to lowercase before saving (already done)

3. **Update seed scripts:**
   - Add default permissions for `accountant`, `store_manager`, `sales`, `optometrist`
   - Create these roles in database seeding

---

## 📁 Files Referencing Roles

### Role Models:
- `microservices/hr-service/src/models/Role.model.js`
- `microservices/auth-service/src/models/Role.model.js`
- `microservices/analytics-service/src/models/Role.model.js`

### Role Validation:
- `microservices/auth-service/src/services/auth.service.js` (line 85)
- `microservices/hr-service/src/routes/hr.routes.js` (line 39)
- `microservices/hr-service/src/routes/onboarding.routes.js` (line 18, 122)
- `microservices/auth-service/src/routes/auth.routes.js` (line 18, 50)

### Role Seeding:
- `microservices/hr-service/src/utils/seedRoles.js`
- `microservices/auth-service/src/models/Role.model.js` (createDefaultRoles method)

### RBAC Usage:
- All route files in `microservices/hr-service/src/routes/`
- `microservices/hr-service/src/middleware/rbac.middleware.js`
- `microservices/auth-service/src/middleware/rbac.middleware.js`

---

## 🎯 Quick Reference

### For Creating Users:
```javascript
// Valid roles (case-insensitive):
'superadmin', 'admin', 'hr', 'manager', 'employee'
// Also accepted but not in enum:
'accountant', 'store_manager', 'sales', 'optometrist'
```

### For Route Protection:
```javascript
// Most common patterns:
requireRole(['HR', 'Admin', 'SuperAdmin'])  // Admin access
requireRole(['hr', 'admin', 'superadmin'])  // Admin access (lowercase)
requireRole(['hr', 'admin', 'manager'])     // Management access
requireRole(['hr', 'admin', 'accountant'])  // Financial access
requireRole(['hr', 'admin', 'manager', 'employee'])  // General access
```

---

**Status**: ✅ **Complete Role Inventory**

**Last Updated**: 2026-01-02

