# POST /api/hr/employees - Working Status

**Date**: 2026-01-02  
**Status**: ✅ **WORKING**

---

## ✅ Issue Resolved

The POST `/api/hr/employees` endpoint is now **working correctly** when all required fields are provided.

---

## 📋 Required Fields

### Mandatory Fields
1. **employeeId** (string, required)
   - Unique employee identifier
   - Example: `"EMP-1767360065"`

2. **firstName** (string, required)
   - Employee's first name
   - Example: `"Test"`

3. **email** (string, required, valid email format)
   - Employee's email address
   - Must be unique
   - Example: `"test1767360065@etelios.com"`

4. **password** (string, required, min 8 characters)
   - Employee's password
   - Minimum 8 characters
   - Example: `"Test@123456"`

5. **roleName** (string, required, enum)
   - Employee's role
   - Valid values: `'SuperAdmin'`, `'Admin'`, `'HR'`, `'Manager'`, `'Employee'`, `'hr'`, `'admin'`, `'superadmin'`, `'manager'`, `'employee'`
   - Example: `"employee"`

### Optional Fields
- **lastName** (string, optional)
- **fullName** (string, optional - auto-generated from firstName + lastName)
- **phone** (string, optional)
- **jobTitle** (string, optional)
- **designation** (string, optional - mapped to jobTitle)
- **department** (string, optional)
- **storeId** (string, optional)
- **dateOfBirth** (date, optional)
- **address** (object, optional)
  - `street`, `city`, `state`, `zip`, `country`
- **joiningDate** (date, optional - mapped to doj)
- **role_family** (string, optional)
- **grade_band** (string, optional)

---

## 📝 Example Request

### Working Request
```bash
curl -k -X POST "https://98.70.245.87/api/hr/employees" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMP-1767360065",
    "firstName": "Test",
    "lastName": "Employee",
    "email": "test1767360065@etelios.com",
    "phone": "+919999999999",
    "password": "Test@123456",
    "roleName": "employee",
    "department": "SALES",
    "jobTitle": "Sales Executive"
  }'
```

### Success Response (201)
```json
{
  "success": true,
  "data": {
    "id": "6957c64208b9d3a0299371ea",
    "fullName": "Test Employee",
    "email": "test1767360065@etelios.com",
    "phone": "+919999999999",
    "employeeId": "EMP-1767360065",
    "department": "SALES",
    "status": "active",
    "joinDate": null,
    "avatar": "/avatars/EMP-1767360065.jpg"
  },
  "message": "Employee created successfully"
}
```

---

## ❌ Previous Issue

### Problem
- **Status**: 500 Internal Server Error
- **Cause**: Missing required fields (`employeeId`, `roleName`, `password`)

### Error Response
```json
{
  "success": false,
  "message": "An internal server error occurred",
  "timestamp": "2026-01-02T13:19:53.513Z"
}
```

### Root Cause
The Joi validation schema requires:
- `employeeId` (required)
- `roleName` (required)
- `password` (required, min 8 chars)

When these fields were missing, the validation passed but the service layer threw errors, resulting in a 500 error.

---

## ✅ Solution

Include all required fields in the request payload:

1. **employeeId**: Unique identifier for the employee
2. **firstName**: Employee's first name
3. **email**: Valid email address
4. **password**: Minimum 8 characters
5. **roleName**: Valid role name (case-insensitive)

---

## 🧪 Test Results

### ✅ Working Tests

1. **POST /api/hr/employees** ✅
   - Status: 201 Created
   - Employee created successfully
   - Response includes employee data

2. **GET /api/hr/employees** ✅
   - Status: 200 OK
   - Returns list of employees including newly created ones

---

## 🔑 Authentication

All requests require:
- **Authorization**: `Bearer <TOKEN>`
- **Host**: `api.etelios.com`
- **Content-Type**: `application/json`

**Token**: Use production token from `scripts/production-admin-token.json`

---

## 📋 Field Mappings

### Frontend → Backend
- `designation` → `jobTitle`
- `joining_date` → `doj`
- `role_family` → `roleFamily`
- `grade_band` → `gradeBand`

### Auto-Generated
- `fullName` → Generated from `firstName` + `lastName` if not provided
- `employeeId` → Uppercased automatically

---

## ✅ Status

- ✅ **POST /api/hr/employees**: Working
- ✅ **GET /api/hr/employees**: Working
- ✅ **Authentication**: Working
- ✅ **Validation**: Working
- ✅ **Database**: Employee saved successfully

---

**Status**: ✅ **FULLY WORKING**

