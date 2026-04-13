# Database Documentation - Lenstrack Smart HRMS

## 📋 Table of Contents

1. [Overview](#overview)
2. [Database Connection](#database-connection)
3. [Database Models](#database-models)
4. [Tenant Isolation](#tenant-isolation)
5. [Indexes & Performance](#indexes--performance)
6. [Relationships & References](#relationships--references)
7. [Environment Variables](#environment-variables)
8. [Connection Pooling](#connection-pooling)
9. [Database Seeding](#database-seeding)
10. [Troubleshooting](#troubleshooting)

---

## Overview

**Database Type:** MongoDB (with support for AWS DocumentDB and Azure Cosmos DB)

**Architecture:** Multi-tenant SaaS application with complete tenant isolation

**Connection Strategy:** Optimized connection pooling with circuit breaker pattern

**Key Features:**
- ✅ Multi-tenant isolation at database level
- ✅ Compound unique indexes per tenant
- ✅ Optimized connection pooling (50 max, 10 min)
- ✅ Automatic retry with exponential backoff
- ✅ Circuit breaker for fault tolerance
- ✅ Query timeout protection
- ✅ Health monitoring

---

## Database Connection

### Connection String Format

```javascript
// Standard MongoDB
mongodb://username:password@host:port/database?authSource=admin

// AWS DocumentDB
mongodb://username:password@docdb-cluster.cluster-xxxxx.ap-south-1.docdb.amazonaws.com:27017/database?tls=true&tlsCAFile=rds-combined-ca-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred

// Azure Cosmos DB
mongodb://account:password@account.mongo.cosmos.azure.com:10255/database?ssl=true&replicaSet=globaldb
```

### Connection Options

The system uses optimized connection options from `optimized-db-connection.js`:

```javascript
{
  maxPoolSize: 50,              // Maximum connections in pool
  minPoolSize: 10,              // Minimum connections to maintain
  maxIdleTimeMS: 30000,         // 30 seconds idle timeout
  serverSelectionTimeoutMS: 15000,  // 15 seconds server selection
  socketTimeoutMS: 45000,       // 45 seconds socket timeout
  connectTimeoutMS: 15000,      // 15 seconds connection timeout
  retryWrites: false,           // Disabled for Cosmos DB
  retryReads: true,             // Enable read retries
  heartbeatFrequencyMS: 10000,  // Health check every 10s
  readPreference: 'secondaryPreferred',  // Distribute load
  w: 1,                         // Write acknowledgment
  j: false,                     // Journal write (faster)
  compressors: ['zlib']          // Network compression
}
```

### Service-Specific Connections

#### Auth Service
- **Database:** `hrms` or `etelios`
- **Port:** 8001
- **Models:** User, Role

#### HR Service
- **Database:** `hr-db` or `etelios`
- **Port:** 3002
- **Models:** User, Store, Department, Roster, RosterSettings, Employee, LeaveBalance, Role

#### Attendance Service
- **Database:** `hrms` or `etelios`
- **Port:** 3003
- **Models:** Attendance

#### Tenant Registry Service
- **Database:** `tenant-registry`
- **Port:** 3004
- **Models:** Tenant

---

## Database Models

### 1. User Model (Auth Service)

**Location:** `microservices/auth-service/src/models/User.model.js`

**Key Fields:**
```javascript
{
  tenantId: String (required, indexed),
  employee_id: String (required, uppercase),
  name: String (required),
  email: String (required, unique, lowercase),
  phone: String (optional),
  password: String (required, minlength: 6),
  role: String (enum: ['superadmin', 'admin', 'hr', 'manager', 'employee', ...]),
  department: String (enum: ['SALES', 'TECH', 'ACCOUNTS', ...]),
  band_level: String (enum: ['A', 'B', 'B+', 'C', 'D', 'E', 'F']),
  hierarchy_level: String (enum: ['STORE', 'AREA', 'REGIONAL', ...]),
  custom_permissions: [String],
  last_login: Date,
  total_login_time: Number,
  isActive: Boolean (default: true),
  isDeleted: Boolean (default: false)
}
```

**Indexes:**
- `{ tenantId: 1, employee_id: 1 }` (unique, compound)
- `{ tenantId: 1, email: 1 }` (unique, compound)
- `{ tenantId: 1 }` (indexed)
- `{ email: 1 }` (indexed)

**Virtual Fields:**
- `fullName` - Combines firstName and lastName
- `isClockedIn` - Checks if user has open attendance session

---

### 2. User Model (HR Service)

**Location:** `microservices/hr-service/src/models/User.model.js`

**Key Fields:**
```javascript
{
  tenantId: String (required, indexed),
  employeeId: String (required, uppercase, indexed),
  firstName: String (required),
  lastName: String (optional),
  email: String (required, unique, lowercase),
  phone: String (optional),
  role: ObjectId (ref: 'Role'),
  department: String,
  designation: String,
  jobTitle: String,
  annual_ctc: Number,
  salary_breakdown: {
    basic: Number,
    hra: Number,
    special_allowance: Number,
    pf_employer: Number,
    gratuity: Number,
    other_allowances: Number
  },
  workLocation: {
    storeId: ObjectId (ref: 'Store'),
    storeCode: String,
    storeName: String
  },
  status: String (enum: ['active', 'inactive', 'suspended', 'terminated']),
  isDeleted: Boolean (default: false)
}
```

**Indexes:**
- `{ tenantId: 1, employeeId: 1 }` (unique, compound) ⚠️ **CRITICAL for tenant isolation**
- `{ tenantId: 1, status: 1 }` (indexed)
- `{ tenantId: 1 }` (indexed)
- `{ email: 1 }` (indexed)
- `{ employeeId: 1 }` (indexed)

**Virtual Fields:**
- `fullName` - Combines firstName and lastName

---

### 3. Attendance Model

**Location:** `microservices/attendance-service/src/models/Attendance.model.js`

**Key Fields:**
```javascript
{
  employee: ObjectId (ref: 'User', required),
  employee_id: String (required, uppercase),
  employeeName: String,
  store: ObjectId (ref: 'Store', required),
  store_code: String (required, uppercase),
  date: Date (required, default: Date.now),
  check_in_time: Date,
  check_out_time: Date,
  check_in_location: {
    latitude: Number (-90 to 90),
    longitude: Number (-180 to 180),
    address: String,
    accuracy: Number
  },
  check_out_location: {
    latitude: Number,
    longitude: Number,
    address: String,
    accuracy: Number
  },
  check_in_selfie: {
    public_id: String,
    secure_url: String,
    uploaded_at: Date
  },
  check_out_selfie: {
    public_id: String,
    secure_url: String,
    uploaded_at: Date
  },
  total_hours: Number (default: 0, min: 0, max: 24),
  break_duration: Number (default: 0),
  overtime_hours: Number (default: 0),
  status: String (enum: ['present', 'absent', 'late', 'half_day', ...]),
  is_approved: Boolean (default: false),
  approved_by: ObjectId (ref: 'User'),
  attendance_type: String (enum: ['regular', 'work_from_home', ...]),
  geofence_status: String (enum: ['valid', 'invalid', 'not_checked']),
  is_late: Boolean (default: false),
  is_early_departure: Boolean (default: false),
  is_geofence_violation: Boolean (default: false),
  is_selfie_verified: Boolean (default: false)
}
```

**Indexes:**
- `{ employee: 1, date: 1 }` (compound)
- `{ employee_id: 1, date: 1 }` (compound)
- `{ store: 1, date: 1 }` (compound)
- `{ date: 1 }` (indexed)
- `{ status: 1 }` (indexed)
- `{ check_in_time: -1 }` (descending)
- `{ employee: 1, check_in_time: -1 }` (compound, descending)
- `{ employee_id: 1, date: -1 }` (compound, descending)

**Virtual Fields:**
- `work_duration_hours` - Calculates hours between check-in and check-out
- `is_present_today` - Checks if employee is present today
- `isClockedIn` - Returns true if `check_in_time` exists and `check_out_time` is null

**Static Methods:**
- `findByEmployeeAndDate(employeeId, date)` - Find attendance for specific employee and date
- `findByEmployeeAndDateRange(employeeId, startDate, endDate)` - Find attendance in date range
- `findByStoreAndDate(storeId, date)` - Find all attendance for a store on a date
- `findPendingApprovals()` - Find all pending approval requests
- `getAttendanceStats(employeeId, startDate, endDate)` - Get statistics
- `getStoreAttendanceStats(storeId, date)` - Get store statistics

**Instance Methods:**
- `isCheckedIn()` - Returns true if checked in but not checked out
- `isCheckedOut()` - Returns true if both check-in and check-out exist
- `getSummary()` - Returns summary object

---

### 4. Store Model

**Location:** `microservices/hr-service/src/models/Store.model.js`

**Key Fields:**
```javascript
{
  tenantId: String (required, default: 'default', indexed),
  name: String (required, indexed),
  code: String (required, unique, uppercase, indexed),
  store_id: String (indexed, legacy support),
  description: String,
  address: {
    street: String (required),
    city: String (required),
    state: String (optional),
    country: String (default: 'India'),
    zipCode: String (optional),
    zip: String (optional)
  },
  coordinates: {
    latitude: Number (-90 to 90),
    longitude: Number (-180 to 180)
  },
  geofenceRadius: Number (required, default: 100, min: 10, max: 1000),
  contact: {
    phone: String,
    email: String
  },
  phone: String (flat field, synced with contact.phone),
  email: String (flat field, synced with contact.email),
  manager: ObjectId (ref: 'User'),
  store_type: String (enum: ['retail', 'warehouse', 'office', ...]),
  operatingHours: Mixed,
  status: String (enum: ['active', 'inactive', 'maintenance', 'closed']),
  is_active: Boolean (default: true),
  isDeleted: Boolean (default: false),
  opening_date: Date (default: Date.now),
  closing_date: Date
}
```

**Indexes:**
- `{ coordinates: '2dsphere' }` (geospatial index for geofencing)
- `{ tenantId: 1, code: 1 }` (unique, compound)
- `{ tenantId: 1, name: 1 }` (unique, compound)
- `{ tenantId: 1 }` (indexed)
- `{ code: 1 }` (indexed)
- `{ name: 1 }` (indexed)
- `{ status: 1 }` (indexed)
- `{ is_active: 1 }` (indexed)
- `{ isDeleted: 1 }` (indexed)

**Virtual Fields:**
- `storeCode` - Alias for `code`
- `latitude` - Direct access to `coordinates.latitude`
- `longitude` - Direct access to `coordinates.longitude`
- `street` - Direct access to `address.street`
- `city` - Direct access to `address.city`
- `state` - Direct access to `address.state`
- `pincode` - Returns `address.zipCode` or `address.zip`
- `country` - Direct access to `address.country`
- `full_address` - Formatted full address string
- `staffCount` - Virtual count of staff (populated from User model)
- `activeStaffCount` - Virtual count of active staff

---

### 5. Roster Model

**Location:** `microservices/hr-service/src/models/Roster.model.js`

**Key Fields:**
```javascript
{
  tenantId: String (required, default: 'default', indexed),
  employee: ObjectId (ref: 'User', required),
  employeeId: String (required, indexed),
  employeeName: String (required),
  store: ObjectId (ref: 'Store', required),
  storeId: String (required),
  storeName: String (required),
  date: Date (required, indexed),
  dayOfWeek: String (enum: ['Monday', 'Tuesday', ...]),
  shift: String (enum: ['MORNING', 'EVENING', 'NIGHT', 'FULL_DAY', 'OFF']),
  shiftStart: String (format: "HH:MM", required if shift !== 'OFF'),
  shiftEnd: String (format: "HH:MM", required if shift !== 'OFF'),
  shiftDuration: Number (in hours, min: 0, max: 24),
  status: String (enum: ['SCHEDULED', 'CONFIRMED', 'COMPLETED', ...]),
  notes: String (maxlength: 500),
  breakDuration: Number (in minutes, default: 30, min: 0, max: 120),
  breakSchedule: [{
    start: String (format: "HH:MM"),
    end: String (format: "HH:MM"),
    duration: Number,
    type: String (enum: ['PAID', 'UNPAID'])
  }],
  createdBy: ObjectId (ref: 'User', required),
  updatedBy: ObjectId (ref: 'User')
}
```

**Indexes:**
- `{ employee: 1, date: 1 }` (compound)
- `{ store: 1, date: 1 }` (compound)
- `{ tenantId: 1, date: 1 }` (compound)
- `{ date: 1, status: 1 }` (compound)
- `{ employee: 1, date: 1, shiftStart: 1 }` (unique, compound) ⚠️ **Prevents duplicate shifts**

**Virtual Fields:**
- `shiftDurationHours` - Calculates shift duration excluding breaks
- `workingHours` - Alias for `shiftDurationHours`

**Static Methods:**
- `checkOverlap(employeeId, date, shiftStart, shiftEnd, excludeRosterId)` - Check for overlapping shifts
- `getStoreRoster(storeId, startDate, endDate, status)` - Get store roster for date range
- `getEmployeeRoster(employeeId, startDate, endDate)` - Get employee roster for date range

---

### 6. Tenant Model

**Location:** `microservices/tenant-registry-service/src/models/Tenant.model.js`

**Key Fields:**
```javascript
{
  tenantId: String (unique, required, indexed),
  tenantName: String (required),
  name: String (required),
  email: String (required, indexed),
  phone: String,
  domain: String (unique, required),
  subdomain: String (unique, required),
  address: {
    street: String,
    city: String,
    state: String,
    country: String (default: 'India'),
    pincode: String
  },
  contact: {
    primaryContact: String,
    primaryEmail: String,
    primaryPhone: String,
    billingContact: String,
    billingEmail: String,
    technicalContact: String,
    technicalEmail: String
  },
  modules: [String] (enum: ['hr', 'crm', 'inventory', ...]),
  planDetails: {
    name: String,
    price: Number,
    currency: String (default: 'INR'),
    billing: String (enum: ['Monthly', 'Quarterly', 'Yearly']),
    features: [String]
  },
  subscription: {
    startDate: Date,
    endDate: Date,
    status: String,
    autoRenew: Boolean
  },
  settings: {
    timezone: String,
    locale: String,
    currency: String
  },
  isActive: Boolean (default: true)
}
```

**Indexes:**
- `{ tenantId: 1 }` (unique, indexed)
- `{ domain: 1 }` (unique, indexed)
- `{ subdomain: 1 }` (unique, indexed)
- `{ email: 1 }` (indexed)

---

## Tenant Isolation

### ⚠️ CRITICAL: Tenant Isolation Implementation

**Every query MUST include `tenantId` filter to prevent cross-tenant data access.**

### Implementation Pattern

```javascript
// ✅ CORRECT: Tenant-aware query
const employees = await User.find({
  tenantId: req.tenantId,  // CRITICAL: Always filter by tenantId
  isDeleted: false,
  status: 'active'
});

// ❌ WRONG: Missing tenantId filter (security risk!)
const employees = await User.find({
  isDeleted: false,
  status: 'active'
});
```

### Compound Unique Indexes

**Purpose:** Ensure uniqueness within each tenant, not globally.

```javascript
// User Model (HR Service)
userSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true });
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

// Store Model
storeSchema.index({ tenantId: 1, code: 1 }, { unique: true });
storeSchema.index({ tenantId: 1, name: 1 }, { unique: true });
```

**Example:**
- Tenant `lenstrack` can have employee `EMP-2026-001`
- Tenant `upcapto` can also have employee `EMP-2026-001`
- Both are valid because of compound unique index `{ tenantId: 1, employeeId: 1 }`

### Tenant ID Extraction

**Middleware:** `microservices/hr-service/src/middleware/tenant.middleware.js`

**Priority Order:**
1. `X-Tenant-Id` header
2. `X-Company-Id` header
3. Query parameter `tenantId`
4. JWT token `tenantId` claim
5. Default: `'default'` (with warning)

```javascript
// Middleware automatically attaches tenantId to req
req.tenantId = 'lenstrack';  // Extracted from header/token

// Use in queries
const query = {
  tenantId: req.tenantId,
  isDeleted: false
};
```

### Tenant Isolation in Service Layer

**Example from `hr.service.js`:**

```javascript
// ✅ CORRECT: Explicit tenant check
const existingEmployeeId = await User.findOne({
  tenantId: { $exists: true, $eq: employeeTenantId },  // CRITICAL
  employeeId: normalizedEmployeeId
});

// ✅ CORRECT: Tenant-filtered query
const query = {
  isDeleted: false,
  tenantId: { $exists: true, $eq: queryTenantId }  // CRITICAL
};
```

---

## Indexes & Performance

### Index Strategy

**Single Field Indexes:**
- Frequently queried fields: `tenantId`, `employeeId`, `email`, `status`, `date`
- Foreign keys: `employee`, `store`, `role`

**Compound Indexes:**
- Query patterns: `{ tenantId: 1, employeeId: 1 }`, `{ employee: 1, date: 1 }`
- Sorting: `{ date: -1 }`, `{ check_in_time: -1 }`

**Geospatial Indexes:**
- Store coordinates: `{ coordinates: '2dsphere' }` (for geofencing)

### Query Optimization

**Use `lean()` for read-only queries:**
```javascript
// ✅ FAST: Returns plain JavaScript objects
const employees = await User.find({ tenantId: 'lenstrack' }).lean();

// ❌ SLOWER: Returns Mongoose documents (overhead)
const employees = await User.find({ tenantId: 'lenstrack' });
```

**Use `select()` to limit fields:**
```javascript
// ✅ FAST: Only fetch required fields
const user = await User.findById(id).select('name email employeeId').lean();

// ❌ SLOWER: Fetches all fields
const user = await User.findById(id);
```

**Use aggregation for complex queries:**
```javascript
// ✅ FAST: Database-side aggregation
const stats = await Attendance.aggregate([
  { $match: { tenantId: 'lenstrack', date: { $gte: startDate, $lte: endDate } } },
  { $group: { _id: '$status', count: { $sum: 1 } } }
]);
```

### Performance Indexes Summary

| Model | Index | Purpose |
|-------|-------|---------|
| User (HR) | `{ tenantId: 1, employeeId: 1 }` | Unique employee per tenant |
| User (HR) | `{ tenantId: 1, email: 1 }` | Unique email per tenant |
| User (HR) | `{ tenantId: 1, status: 1 }` | Filter active employees |
| Attendance | `{ employee: 1, date: 1 }` | Daily attendance lookup |
| Attendance | `{ employee_id: 1, date: -1 }` | Recent attendance (descending) |
| Attendance | `{ check_in_time: -1 }` | Recent check-ins |
| Store | `{ coordinates: '2dsphere' }` | Geofencing queries |
| Store | `{ tenantId: 1, code: 1 }` | Unique store code per tenant |
| Roster | `{ employee: 1, date: 1 }` | Employee schedule lookup |
| Roster | `{ store: 1, date: 1 }` | Store roster lookup |

---

## Relationships & References

### Reference Pattern

**Mongoose Population:**
```javascript
// One-to-Many: Employee -> Attendance
const attendance = await Attendance.findById(id)
  .populate('employee', 'name email employeeId')
  .populate('store', 'name code address');

// Many-to-One: Attendance -> Employee
const employee = await User.findById(employeeId)
  .populate('role', 'name permissions');
```

### Key Relationships

**User (Employee) ↔ Store:**
- `User.workLocation.storeId` → `Store._id`
- `Store.manager` → `User._id`

**User (Employee) ↔ Attendance:**
- `Attendance.employee` → `User._id`
- `Attendance.employee_id` → `User.employeeId` (denormalized for performance)

**User (Employee) ↔ Roster:**
- `Roster.employee` → `User._id`
- `Roster.employeeId` → `User.employeeId` (denormalized)

**Store ↔ Attendance:**
- `Attendance.store` → `Store._id`
- `Attendance.store_code` → `Store.code` (denormalized)

**Store ↔ Roster:**
- `Roster.store` → `Store._id`
- `Roster.storeId` → `Store._id` (string reference)

**User ↔ Role:**
- `User.role` → `Role._id`

---

## Environment Variables

### Required Variables

```bash
# Database Connection
MONGO_URI=mongodb://username:password@host:port/database?authSource=admin
# OR
MONGODB_URI=mongodb://username:password@host:port/database?authSource=admin

# Database Name (optional, extracted from MONGO_URI if not provided)
MONGO_DB_NAME=hr-db
DB_NAME=hr-db

# Service Ports
PORT=3002                    # HR Service
AUTH_SERVICE_PORT=8001       # Auth Service
ATTENDANCE_SERVICE_PORT=3003 # Attendance Service

# JWT Secret (for tenant extraction from tokens)
JWT_SECRET=your-secret-key

# AWS S3 (for selfie/document storage)
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=etelios-prod-storage
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### Connection String Examples

**Local MongoDB:**
```bash
MONGO_URI=mongodb://localhost:27017/hrms
```

**AWS DocumentDB:**
```bash
MONGO_URI=mongodb://username:password@docdb-cluster.cluster-xxxxx.ap-south-1.docdb.amazonaws.com:27017/hrms?tls=true&tlsCAFile=rds-combined-ca-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred
```

**Azure Cosmos DB:**
```bash
MONGO_URI=mongodb://account:password@account.mongo.cosmos.azure.com:10255/hrms?ssl=true&replicaSet=globaldb
```

---

## Connection Pooling

### Pool Configuration

**From `optimized-db-connection.js`:**

```javascript
{
  maxPoolSize: 50,        // Maximum connections
  minPoolSize: 10,       // Minimum connections (warm pool)
  maxIdleTimeMS: 30000,  // 30 seconds idle timeout
  serverSelectionTimeoutMS: 15000,  // 15 seconds
  socketTimeoutMS: 45000, // 45 seconds
  connectTimeoutMS: 15000 // 15 seconds
}
```

### Circuit Breaker Pattern

**States:**
- `CLOSED` - Normal operation
- `OPEN` - Too many failures, reject requests
- `HALF_OPEN` - Testing if service recovered

**Configuration:**
```javascript
{
  threshold: 5,              // Open after 5 failures
  timeout: 60000,            // 60 seconds before retry
  halfOpenMaxSuccess: 3      // Need 3 successes to close
}
```

### Health Monitoring

**Connection Metrics:**
```javascript
{
  totalConnections: 0,
  activeConnections: 0,
  failedConnections: 0,
  queryCount: 0,
  slowQueries: 0,
  timeoutQueries: 0
}
```

**Health Check Endpoint:**
```javascript
GET /api/health
{
  "healthy": true,
  "database": {
    "state": "connected",
    "circuitBreaker": "CLOSED",
    "metrics": { ... }
  }
}
```

---

## Database Seeding

### Initial Data Setup

**1. Create Superadmin:**
```javascript
const superadmin = {
  tenantId: 'upcapto',
  employee_id: 'SUPER-001',
  name: 'Super Admin',
  email: 'superadmin@upcapto.com',
  password: 'hashed_password',
  role: 'superadmin',
  department: 'HR',
  isActive: true
};
```

**2. Create Tenants:**
```javascript
const tenants = [
  {
    tenantId: 'lenstrack',
    tenantName: 'Lenstrack',
    domain: 'lenstrack.com',
    subdomain: 'lenstrack',
    email: 'admin@lenstrack.com'
  },
  {
    tenantId: 'upcapto',
    tenantName: 'Upcapto',
    domain: 'upcapto.com',
    subdomain: 'upcapto',
    email: 'admin@upcapto.com'
  },
  {
    tenantId: 'eyekra',
    tenantName: 'Eyekra',
    domain: 'eyekra.com',
    subdomain: 'eyekra',
    email: 'admin@eyekra.com'
  }
];
```

**3. Create Tenant Admins:**
```javascript
const admin = {
  tenantId: 'lenstrack',
  employeeId: 'EMP-2026-001',
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@lenstrack.com',
  password: 'hashed_password',
  role: 'admin',
  department: 'HR',
  status: 'active'
};
```

### Seeding Script Example

```javascript
// scripts/seed-database.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../microservices/hr-service/src/models/User.model');
const Tenant = require('../microservices/tenant-registry-service/src/models/Tenant.model');

async function seedDatabase() {
  // Connect to database
  await mongoose.connect(process.env.MONGO_URI);
  
  // Create tenants
  const tenants = await Tenant.insertMany([...]);
  
  // Create superadmin
  const hashedPassword = await bcrypt.hash('password123', 10);
  const superadmin = await User.create({
    tenantId: 'upcapto',
    employeeId: 'SUPER-001',
    firstName: 'Super',
    lastName: 'Admin',
    email: 'superadmin@upcapto.com',
    password: hashedPassword,
    role: 'superadmin',
    department: 'HR',
    status: 'active'
  });
  
  console.log('✅ Database seeded successfully');
  process.exit(0);
}

seedDatabase().catch(console.error);
```

---

## Troubleshooting

### Common Issues

#### 1. Connection Timeout

**Error:**
```
MongoServerSelectionError: Server selection timed out after 15000 ms
```

**Solutions:**
- Check network connectivity
- Verify MongoDB is running
- Check firewall rules
- Increase `serverSelectionTimeoutMS` (not recommended)

#### 2. Authentication Failed

**Error:**
```
MongoServerError: Authentication failed
```

**Solutions:**
- Verify username/password in connection string
- Check `authSource` parameter
- Verify user has proper permissions

#### 3. Tenant Isolation Violation

**Error:**
```
DuplicateKeyError: E11000 duplicate key error collection: users index: employeeId_1 dup key
```

**Solutions:**
- Ensure compound unique index `{ tenantId: 1, employeeId: 1 }` exists
- Verify all queries include `tenantId` filter
- Check middleware is extracting `tenantId` correctly

#### 4. Slow Queries

**Symptoms:**
- API responses > 2 seconds
- Database CPU high
- Connection pool exhausted

**Solutions:**
- Add missing indexes
- Use `lean()` for read-only queries
- Use aggregation pipelines for complex queries
- Limit result sets with `.limit()`
- Use `.select()` to fetch only required fields

#### 5. Circuit Breaker Open

**Error:**
```
Circuit breaker is OPEN - Database is unavailable
```

**Solutions:**
- Check database connection
- Verify MongoDB is running
- Check network connectivity
- Wait 60 seconds for automatic retry (HALF_OPEN state)

#### 6. Missing Employee/Store

**Error:**
```
Employee not found in backend
```

**Solutions:**
- Verify employee exists in correct tenant
- Check `tenantId` in query matches employee's `tenantId`
- Verify employee is not soft-deleted (`isDeleted: false`)
- Check employee status is `'active'`

#### 7. Store Code Cast Error

**Error:**
```
Cast to ObjectId failed for value "LK001" (type string) at path "store"
```

**Solutions:**
- Store codes are strings, not ObjectIds
- Use `Store.findOne({ code: 'LK001' })` instead of `Store.findById('LK001')`
- Check `storeId` vs `storeCode` usage in code

### Debugging Queries

**Enable Mongoose Debug Mode:**
```javascript
// In server.js
mongoose.set('debug', true);  // Logs all queries
```

**Check Index Usage:**
```javascript
// Explain query execution
const explanation = await User.find({ tenantId: 'lenstrack' })
  .explain('executionStats');
console.log(explanation);
```

**Monitor Slow Queries:**
```javascript
// From optimized-db-connection.js
const metrics = getConnectionMetrics();
console.log('Slow queries:', metrics.slowQueries);
console.log('Timeout queries:', metrics.timeoutQueries);
```

### Health Check Commands

**Check Database Connection:**
```bash
# From terminal
mongosh "mongodb://username:password@host:port/database" --eval "db.adminCommand('ping')"
```

**Check Indexes:**
```bash
# List all indexes
mongosh "mongodb://..." --eval "db.users.getIndexes()"
```

**Check Collection Stats:**
```bash
# Collection statistics
mongosh "mongodb://..." --eval "db.users.stats()"
```

---

## Best Practices

### ✅ DO

1. **Always filter by `tenantId`** in queries
2. **Use compound unique indexes** for tenant isolation
3. **Use `lean()`** for read-only queries
4. **Use `.select()`** to limit fields
5. **Use aggregation pipelines** for complex queries
6. **Add indexes** for frequently queried fields
7. **Use connection pooling** (automatic via `optimized-db-connection.js`)
8. **Handle errors gracefully** with try-catch
9. **Log slow queries** for monitoring
10. **Use virtual fields** for computed properties

### ❌ DON'T

1. **Don't query without `tenantId`** filter
2. **Don't use global unique indexes** (use compound with `tenantId`)
3. **Don't fetch all fields** when only few are needed
4. **Don't use `.populate()`** unnecessarily (adds overhead)
5. **Don't ignore connection errors** (use circuit breaker)
6. **Don't hardcode database names** (use environment variables)
7. **Don't use `findOne()` without indexes** on large collections
8. **Don't store sensitive data** without encryption
9. **Don't use `$where`** (slow, use aggregation instead)
10. **Don't forget to handle timeouts** in long-running queries

---

## Summary

**Key Takeaways:**

1. ✅ **Multi-tenant architecture** with complete isolation
2. ✅ **Optimized connection pooling** (50 max, 10 min)
3. ✅ **Circuit breaker pattern** for fault tolerance
4. ✅ **Compound unique indexes** per tenant
5. ✅ **Performance indexes** for common queries
6. ✅ **Geospatial indexes** for geofencing
7. ✅ **Virtual fields** for computed properties
8. ✅ **Health monitoring** and metrics
9. ✅ **Automatic retry** with exponential backoff
10. ✅ **Query timeout protection**

**For Questions or Issues:**
- Check service logs: `microservices/*/logs/`
- Check health endpoint: `GET /api/health`
- Review connection metrics: `getConnectionMetrics()`
- Verify tenant isolation: Check all queries include `tenantId`

---

**Last Updated:** 2026-02-26  
**Version:** 1.0.0  
**Maintained By:** Backend Team
