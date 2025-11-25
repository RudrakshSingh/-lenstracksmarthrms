# API Migration Guide
## Updating Code to Match API Documentation

This guide will help you update all endpoints to match the standardized API documentation format.

---

## 📋 Overview

**Total Endpoints to Update:** 226+ endpoints across 3 MFEs
- HRMS MFE: 150+ endpoints
- Shell MFE: 62+ endpoints  
- Admin MFE: 14 endpoints

---

## 🎯 Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful",
  "pagination": { /* if applicable */ }
}
```

### Error Response (400)
```json
{
  "success": false,
  "error": "Validation error message",
  "message": "Validation failed"
}
```

### Error Response (404)
```json
{
  "success": false,
  "error": "Resource with ID XXX not found",
  "message": "Resource not found in backend"
}
```

### Error Response (503)
```json
{
  "success": false,
  "error": "Failed to fetch from backend",
  "message": "Backend API is unavailable. Please try again later."
}
```

---

## 🛠️ Step-by-Step Migration Process

### Step 1: Import Response Utilities

Add to the top of your controller file:

```javascript
const { 
  sendSuccess, 
  sendError, 
  sendNotFound, 
  sendServiceUnavailable,
  createPagination,
  parsePagination,
  parseFilters,
  formatEmployee,
  formatDepartment,
  formatAttendance,
  validateRequired
} = require('../../shared/utils/response.util');
```

**Note:** Adjust the path based on your service structure:
- For `microservices/hr-service`: `../../shared/utils/response.util`
- For `microservices/auth-service`: `../../shared/utils/response.util`
- For root services: `../shared/utils/response.util`

---

### Step 2: Update GET Endpoints (List)

**Before:**
```javascript
const getEmployees = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await HRService.getEmployees({}, page, limit);
    
    res.status(200).json({
      success: true,
      message: 'Employees retrieved successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};
```

**After:**
```javascript
const getEmployees = async (req, res, next) => {
  try {
    // Parse pagination
    const { page, limit, skip } = parsePagination(req.query);
    
    // Parse filters
    const allowedFilters = ['department', 'status', 'store', 'role', 'manager'];
    const filters = parseFilters(req.query, allowedFilters);

    // Get data from service
    const result = await HRService.getEmployees(filters, page, limit);

    // Format data
    const employees = Array.isArray(result.data) 
      ? result.data.map(emp => formatEmployee(emp))
      : (result.employees || []).map(emp => formatEmployee(emp));

    // Create pagination
    const total = result.total || result.count || employees.length;
    const pagination = createPagination(page, limit, total);

    // Send standardized response
    return sendSuccess(res, employees, 'Employees retrieved successfully', pagination, 200);
  } catch (error) {
    logger.error('Error in getEmployees', { error: error.message });
    
    if (error.message && error.message.includes('unavailable')) {
      return sendServiceUnavailable(res, 'fetch employees');
    }
    
    next(error);
  }
};
```

---

### Step 3: Update POST Endpoints (Create)

**Before:**
```javascript
const createEmployee = async (req, res, next) => {
  try {
    const employeeData = req.body;
    const employee = await HRService.createEmployee(employeeData);
    
    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employee
    });
  } catch (error) {
    next(error);
  }
};
```

**After:**
```javascript
const createEmployee = async (req, res, next) => {
  try {
    const employeeData = req.body;

    // Validate required fields
    const requiredFields = ['fullName', 'email', 'department'];
    const validationError = validateRequired(employeeData, requiredFields);
    if (validationError) {
      return sendError(res, validationError.error, validationError.message, 400);
    }

    // Create employee
    const employee = await HRService.createEmployee(employeeData);

    // Format response
    const formattedEmployee = formatEmployee(employee);

    // Send standardized response
    return sendSuccess(res, formattedEmployee, 'Employee created successfully', null, 201);
  } catch (error) {
    logger.error('Error in createEmployee', { error: error.message });
    
    if (error.message && error.message.includes('unavailable')) {
      return sendServiceUnavailable(res, 'create employee');
    }
    
    if (error.name === 'ValidationError' || error.statusCode === 400) {
      return sendError(res, error.message || 'Validation failed', 'Validation failed', 400);
    }
    
    next(error);
  }
};
```

---

### Step 4: Update GET Endpoints (Single Resource)

**Before:**
```javascript
const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employee = await HRService.getEmployeeById(id);
    
    res.status(200).json({
      success: true,
      message: 'Employee retrieved successfully',
      data: employee
    });
  } catch (error) {
    next(error);
  }
};
```

**After:**
```javascript
const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employee = await HRService.getEmployeeById(id);

    if (!employee) {
      return sendNotFound(res, 'Employee', id);
    }

    // Format response
    const formattedEmployee = formatEmployee(employee);

    return sendSuccess(res, formattedEmployee, 'Employee retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getEmployeeById', { error: error.message });
    
    if (error.name === 'CastError' || error.statusCode === 404 || error.message.includes('not found')) {
      return sendNotFound(res, 'Employee', req.params.id);
    }
    
    next(error);
  }
};
```

---

### Step 5: Update PUT/PATCH Endpoints (Update)

**Before:**
```javascript
const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const employee = await HRService.updateEmployee(id, updateData);
    
    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: employee
    });
  } catch (error) {
    next(error);
  }
};
```

**After:**
```javascript
const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const employee = await HRService.updateEmployee(id, updateData);

    if (!employee) {
      return sendNotFound(res, 'Employee', id);
    }

    // Format response
    const formattedEmployee = formatEmployee(employee);

    return sendSuccess(res, formattedEmployee, 'Employee updated successfully', null, 200);
  } catch (error) {
    logger.error('Error in updateEmployee', { error: error.message });
    
    if (error.name === 'CastError' || error.statusCode === 404) {
      return sendNotFound(res, 'Employee', req.params.id);
    }
    
    if (error.name === 'ValidationError' || error.statusCode === 400) {
      return sendError(res, error.message || 'Validation failed', 'Validation failed', 400);
    }
    
    next(error);
  }
};
```

---

### Step 6: Update DELETE Endpoints

**Before:**
```javascript
const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    await HRService.deleteEmployee(id);
    
    res.status(200).json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
```

**After:**
```javascript
const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await HRService.deleteEmployee(id);

    if (!result || result.deletedCount === 0) {
      return sendNotFound(res, 'Employee', id);
    }

    return sendSuccess(res, null, 'Employee deleted successfully', null, 200);
  } catch (error) {
    logger.error('Error in deleteEmployee', { error: error.message });
    
    if (error.name === 'CastError' || error.statusCode === 404) {
      return sendNotFound(res, 'Employee', req.params.id);
    }
    
    next(error);
  }
};
```

---

## 📝 Endpoint-Specific Updates

### HRMS MFE Endpoints

#### Employees (`/api/employees`)
- ✅ GET `/api/employees` - Updated
- ✅ POST `/api/employees` - Updated
- ⏳ GET `/api/employees/[id]` - Needs update
- ⏳ PUT `/api/employees/[id]` - Needs update
- ⏳ DELETE `/api/employees/[id]` - Needs update

#### Departments (`/api/hr/departments`)
- ⏳ GET `/api/hr/departments` - Needs update
- ⏳ POST `/api/hr/departments` - Needs update
- ⏳ GET `/api/hr/departments/[id]` - Needs update
- ⏳ PUT `/api/hr/departments/[id]` - Needs update

#### Attendance (`/api/attendance`)
- ⏳ GET `/api/attendance` - Needs update
- ⏳ POST `/api/attendance` - Needs update

#### Letters (`/api/letters`)
- ⏳ GET `/api/letters` - Needs update
- ⏳ POST `/api/letters` - Needs update
- ⏳ GET `/api/letters/[id]` - Needs update

### Shell MFE Endpoints

#### Dashboard (`/api/dashboard`)
- ⏳ GET `/api/dashboard/stats` - Needs update
- ⏳ GET `/api/dashboard/recent-activities` - Needs update
- ⏳ GET `/api/dashboard/[role]` - Needs update

#### Authentication (`/api/auth`)
- ⏳ POST `/api/auth/register` - Needs update
- ⏳ POST `/api/auth/forgot-password` - Needs update
- ⏳ GET `/api/auth/profile` - Needs update

### Admin MFE Endpoints

#### Branches (`/api/branches`)
- ⏳ GET `/api/branches` - Needs update
- ⏳ POST `/api/branches` - Needs update
- ⏳ GET `/api/branches/[id]` - Needs update

#### Tenants (`/api/tenants`)
- ⏳ GET `/api/tenants` - Needs update
- ⏳ POST `/api/tenants` - Needs update

---

## 🔄 Migration Checklist

For each endpoint, ensure:

- [ ] Import response utilities
- [ ] Use `sendSuccess()` for success responses
- [ ] Use `sendError()` for error responses
- [ ] Use `sendNotFound()` for 404 errors
- [ ] Use `sendServiceUnavailable()` for 503 errors
- [ ] Add pagination for list endpoints
- [ ] Validate required fields for POST/PUT
- [ ] Format response data using formatter functions
- [ ] Add proper error handling
- [ ] Update error messages to match documentation
- [ ] Test endpoint with documentation examples

---

## 🚀 Quick Migration Script

You can use this pattern to quickly update endpoints:

1. **Find and replace** in your controller:
   - `res.status(200).json({ success: true, ... })` → `sendSuccess(res, ...)`
   - `res.status(400).json({ success: false, ... })` → `sendError(res, ...)`
   - `res.status(404).json({ ... })` → `sendNotFound(res, ...)`

2. **Add pagination** to list endpoints:
   - Use `parsePagination()` and `createPagination()`

3. **Add validation** to create/update endpoints:
   - Use `validateRequired()`

4. **Format responses**:
   - Use formatter functions (`formatEmployee`, `formatDepartment`, etc.)

---

## 📚 Next Steps

1. ✅ Response utility created (`microservices/shared/utils/response.util.js`)
2. ✅ Example controller updated (`hrController.js` - employees endpoints)
3. ⏳ Update remaining HRMS endpoints
4. ⏳ Update Shell MFE endpoints
5. ⏳ Update Admin MFE endpoints
6. ⏳ Test all endpoints
7. ⏳ Update API documentation if needed

---

## 💡 Tips

- **Start with one service** - Update all endpoints in one service before moving to the next
- **Test as you go** - Test each endpoint after updating
- **Use formatters** - Create formatter functions for complex objects
- **Consistent error handling** - Use the utility functions for all errors
- **Document changes** - Keep track of which endpoints you've updated

---

**Status:** In Progress  
**Last Updated:** 2025-01-21

