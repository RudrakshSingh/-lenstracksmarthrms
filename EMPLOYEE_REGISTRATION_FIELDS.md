# Employee Registration Fields

**Endpoint**: `POST /api/auth/register`  
**Authentication**: Required (Admin or HR role)  
**Content-Type**: `application/json`

---

## ✅ Required Fields

### 1. `employee_id`
- **Type**: String
- **Required**: Yes
- **Max Length**: 20 characters
- **Format**: Alphanumeric (e.g., "EMP-2026-866556")
- **Example**: `"EMP-2026-866556"`

### 2. `name`
- **Type**: String
- **Required**: Yes
- **Max Length**: 100 characters
- **Example**: `"John Doe"`

### 3. `email`
- **Type**: String (Email)
- **Required**: Yes
- **Format**: Valid email address (automatically lowercased)
- **Example**: `"john.doe@etelios.com"`

### 4. `phone`
- **Type**: String
- **Required**: Yes
- **Pattern**: `^\+?[\d\s-()]+$` (allows +, digits, spaces, hyphens, parentheses)
- **Example**: `"+91 98798 76543"` or `"+919879876543"`

### 5. `password`
- **Type**: String
- **Required**: Yes
- **Min Length**: 6 characters
- **Max Length**: 100 characters
- **Example**: `"Secure@123456"`

### 6. `role`
- **Type**: String (Enum)
- **Required**: Yes
- **Valid Values**: 
  - `"admin"`
  - `"hr"`
  - `"manager"`
  - `"employee"`
- **Note**: Role will be created automatically if it doesn't exist
- **Example**: `"employee"`

### 7. `department`
- **Type**: String
- **Required**: Yes
- **Max Length**: 100 characters
- **Example**: `"TECH"` or `"SALES"` or `"HR"`

### 8. `designation`
- **Type**: String
- **Required**: Yes
- **Max Length**: 100 characters
- **Example**: `"Software Developer"` or `"HR Manager"`

### 9. `joining_date`
- **Type**: Date (ISO 8601 format)
- **Required**: Yes
- **Format**: `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss.sssZ`
- **Example**: `"2026-01-02"` or `"2026-01-02T00:00:00.000Z"`

---

## 🔹 Optional Fields

### 10. `stores`
- **Type**: Array of ObjectIds (MongoDB ObjectIds)
- **Required**: No
- **Format**: Array of 24-character hex strings
- **Example**: `["507f1f77bcf86cd799439011", "507f191e810c19729de860ea"]`

### 11. `reporting_manager`
- **Type**: ObjectId (MongoDB ObjectId)
- **Required**: No
- **Format**: 24-character hex string
- **Example**: `"507f1f77bcf86cd799439011"`

### 12. `date_of_birth`
- **Type**: Date (ISO 8601 format)
- **Required**: No
- **Format**: `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss.sssZ`
- **Example**: `"1995-01-15"`

### 13. `address`
- **Type**: Object
- **Required**: No
- **Fields**:
  - `street` (string, max 200 chars)
  - `city` (string, max 100 chars)
  - `state` (string, max 100 chars)
  - `country` (string, max 100 chars)
  - `pincode` (string, max 10 chars)
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

### 14. `emergency_contact`
- **Type**: Object
- **Required**: No
- **Fields**:
  - `name` (string, max 100 chars)
  - `relationship` (string, max 50 chars)
  - `phone` (string, pattern: `^\+?[\d\s-()]+$`)
- **Example**:
  ```json
  {
    "name": "Jane Doe",
    "relationship": "Spouse",
    "phone": "+91 98765 43210"
  }
  ```

---

## 📝 Complete Example

### Minimal Required Payload
```json
{
  "employee_id": "EMP-2026-866556",
  "name": "John Doe",
  "email": "john.doe@etelios.com",
  "phone": "+91 98798 76543",
  "password": "Secure@123456",
  "role": "employee",
  "department": "TECH",
  "designation": "Software Developer",
  "joining_date": "2026-01-02"
}
```

### Full Payload with Optional Fields
```json
{
  "employee_id": "EMP-2026-866556",
  "name": "John Doe",
  "email": "john.doe@etelios.com",
  "phone": "+91 98798 76543",
  "password": "Secure@123456",
  "role": "employee",
  "department": "TECH",
  "designation": "Software Developer",
  "joining_date": "2026-01-02",
  "date_of_birth": "1995-01-15",
  "stores": ["507f1f77bcf86cd799439011"],
  "reporting_manager": "507f191e810c19729de860ea",
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
    "phone": "+91 98765 43210"
  }
}
```

---

## 🔐 Authentication

**Required**: Yes  
**Header**: `Authorization: Bearer <token>`  
**Roles Allowed**: `admin` or `hr`

---

## ✅ Validation Rules

1. **Email**: Must be valid email format, automatically lowercased
2. **Phone**: Must match pattern `^\+?[\d\s-()]+$`
3. **Password**: Minimum 6 characters, maximum 100 characters
4. **Role**: Must be one of: `admin`, `hr`, `manager`, `employee`
5. **Employee ID**: Automatically converted to uppercase
6. **Stores**: Must be valid MongoDB ObjectIds (24 hex characters)
7. **Reporting Manager**: Must be valid MongoDB ObjectId (24 hex characters)

---

## ⚠️ Common Errors

### 400 Bad Request
- Missing required fields
- Invalid email format
- Invalid phone format
- Invalid role
- Invalid date format
- Password too short

### 401 Unauthorized
- Missing authentication token
- Invalid token
- User doesn't have admin/hr role

### 400 Conflict
- Email already exists
- Employee ID already exists

---

## 📋 Frontend Integration

### Example Request
```javascript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    employee_id: 'EMP-2026-866556',
    name: 'John Doe',
    email: 'john.doe@etelios.com',
    phone: '+91 98798 76543',
    password: 'Secure@123456',
    role: 'employee',
    department: 'TECH',
    designation: 'Software Developer',
    joining_date: '2026-01-02'
  })
});
```

---

**Last Updated**: 2026-01-02

