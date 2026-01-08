# 🗄️ Database Connection - Simple Explanation

**Single Connection String, Multiple Databases**

---

## 📝 Concept

### ❌ OLD (Wrong Approach - Multiple Connection Strings):
```bash
AUTH_SERVICE_DB_URI=mongodb://host:port/auth-db?params
HR_SERVICE_DB_URI=mongodb://host:port/hr-db?params
ATTENDANCE_SERVICE_DB_URI=mongodb://host:port/attendance-db?params
```

### ✅ NEW (Correct - Single Connection + DB Names):
```bash
# One connection string for ALL services
MONGO_URI=mongodb://user:pass@host:port/?ssl=true&retryWrites=false...

# Different database names for each service
AUTH_SERVICE_DB_NAME=auth-db
HR_SERVICE_DB_NAME=hr-db
ATTENDANCE_SERVICE_DB_NAME=attendance-db
```

---

## 🔗 How It Works

### Single MongoDB/Cosmos DB Instance:
```
Azure Cosmos DB Instance
├── auth-db              (Auth Service data)
├── hr-db                (HR Service data)
├── attendance-db        (Attendance data)
├── payroll-db           (Payroll data)
├── notification-db      (Notifications)
├── analytics-db         (Analytics & Reports)
├── document-db          (Documents & Files)
├── crm-db               (CRM data)
├── cpp-db               (Contact lens prescriptions)
├── prescription-db      (Prescriptions)
├── purchase-db          (Purchase orders)
├── sales-db             (Sales records)
├── inventory-db         (Inventory management)
├── financial-db         (Financial records)
├── service-management-db (Service management)
├── realtime-db          (Real-time data)
├── tenant-registry-db   (Multi-tenant registry)
└── monitoring-db        (Monitoring & Logs)
```

### Connection Example:
```javascript
// In any service
const mongoose = require('mongoose');

// Base connection
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.AUTH_SERVICE_DB_NAME; // or HR_SERVICE_DB_NAME etc.

// Connect with specific database
mongoose.connect(MONGO_URI, {
  dbName: DB_NAME,  // ✅ This selects which database to use
  retryWrites: false,
  // ... other options
});

// Now all queries go to the specified database
```

---

## 📋 Full Configuration

### In .env file:
```bash
# ===============================
# Single MongoDB Connection
# ===============================
MONGO_URI=mongodb://etelios-mongo-db:PASSWORD@etelios-mongo-db.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retryWrites=false&maxIdleTimeMS=120000&appName=@etelios-mongo-db@

# ===============================
# Database Names (per service)
# ===============================
AUTH_SERVICE_DB_NAME=auth-db
HR_SERVICE_DB_NAME=hr-db
ATTENDANCE_SERVICE_DB_NAME=attendance-db
PAYROLL_SERVICE_DB_NAME=payroll-db
# ... etc
```

### In each service's code:
```javascript
// auth-service/src/server.js
const dbName = process.env.AUTH_SERVICE_DB_NAME || 'auth-db';
mongoose.connect(process.env.MONGO_URI, { dbName });

// hr-service/src/server.js
const dbName = process.env.HR_SERVICE_DB_NAME || 'hr-db';
mongoose.connect(process.env.MONGO_URI, { dbName });

// attendance-service/src/server.js
const dbName = process.env.ATTENDANCE_SERVICE_DB_NAME || 'attendance-db';
mongoose.connect(process.env.MONGO_URI, { dbName });
```

---

## 🔐 Connection String Components

### Full Connection String Breakdown:
```
mongodb://[username]:[password]@[host]:[port]/?[parameters]
```

### Example:
```
mongodb://etelios-mongo-db:h4cmg34pAbKZxyZ@etelios-mongo-db.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retryWrites=false&maxIdleTimeMS=120000&appName=@etelios-mongo-db@
```

**Parameters:**
- `ssl=true` - Secure connection (required for Cosmos DB)
- `replicaSet=globaldb` - Cosmos DB replica set name
- `retryWrites=false` - Cosmos DB doesn't support retryable writes
- `maxIdleTimeMS=120000` - Connection timeout (2 minutes)
- `appName=@etelios-mongo-db@` - Application identifier

---

## 🎯 Benefits of Single Connection

### 1. **Simpler Configuration**
```bash
# One connection string instead of 18!
MONGO_URI=mongodb://...

# Just change the database name
DB_NAME=auth-db  # or hr-db, or attendance-db
```

### 2. **Easier Updates**
If password changes:
```bash
# Update once
MONGO_URI=mongodb://user:NEW_PASSWORD@host:port/?...

# All services automatically use new password
```

### 3. **Better Resource Management**
- Single connection pool
- Reduced network overhead
- Easier monitoring

### 4. **Cost Effective**
- One Cosmos DB account
- Multiple databases
- Shared throughput (if configured)

---

## 📊 Current Database Setup

### Production (Azure Cosmos DB):
```bash
Connection: etelios-mongo-db.mongo.cosmos.azure.com:10255
Account: etelios-mongo-db
Type: MongoDB API (Cosmos DB)

Databases:
✅ auth-db              (Users, Roles, Permissions)
✅ hr-db                (Employees, Departments, Stores)
✅ attendance-db        (Clock-in/out, Records)
✅ payroll-db           (Salary, Deductions, Payslips)
✅ notification-db      (Alerts, Messages, Email logs)
✅ analytics-db         (Reports, Metrics, Dashboards)
✅ document-db          (Files, Documents, Uploads)
✅ crm-db              (Customers, Leads, Contacts)
✅ cpp-db              (Contact lens prescriptions)
✅ prescription-db      (Medical prescriptions)
✅ purchase-db         (Purchase orders, Vendors)
✅ sales-db            (Sales records, Invoices)
✅ inventory-db        (Stock, Products, Warehouses)
✅ financial-db        (Accounting, Ledgers)
✅ service-management-db (Service requests, Tickets)
✅ realtime-db         (WebSocket, Real-time updates)
✅ tenant-registry-db  (Multi-tenancy management)
✅ monitoring-db       (System logs, Health checks)
```

---

## 🚀 How Services Connect

### Auth Service:
```javascript
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.AUTH_SERVICE_DB_NAME || 'auth-db';

mongoose.connect(MONGO_URI, {
  dbName: DB_NAME,
  retryWrites: false,
  // ...
});

// Now connected to 'auth-db'
const User = mongoose.model('User', userSchema);
// User model will use 'auth-db'
```

### HR Service:
```javascript
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.HR_SERVICE_DB_NAME || 'hr-db';

mongoose.connect(MONGO_URI, {
  dbName: DB_NAME,
  retryWrites: false,
  // ...
});

// Now connected to 'hr-db'
const Employee = mongoose.model('Employee', employeeSchema);
// Employee model will use 'hr-db'
```

---

## 🔧 Kubernetes Configuration

### In ConfigMap:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: etelios-config-prod
data:
  MONGO_URI: "mongodb://..."
  AUTH_SERVICE_DB_NAME: "auth-db"
  HR_SERVICE_DB_NAME: "hr-db"
  # ... other DB names
```

### In Secret:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: etelios-secrets
data:
  MONGO_URI: <base64-encoded-connection-string>
```

### In Deployment:
```yaml
env:
  - name: MONGO_URI
    valueFrom:
      secretKeyRef:
        name: etelios-secrets
        key: MONGO_URI
  - name: DB_NAME
    value: "auth-db"  # Service-specific
```

---

## ✅ Summary

### What You Need:

1. **One Connection String:**
```bash
MONGO_URI=mongodb://user:pass@host:port/?params
```

2. **Database Names for Each Service:**
```bash
AUTH_SERVICE_DB_NAME=auth-db
HR_SERVICE_DB_NAME=hr-db
ATTENDANCE_SERVICE_DB_NAME=attendance-db
# etc...
```

3. **Service Connects Like This:**
```javascript
mongoose.connect(MONGO_URI, { dbName: AUTH_SERVICE_DB_NAME });
```

### Benefits:
✅ Simpler configuration  
✅ One connection string to manage  
✅ Easy password updates  
✅ Better resource usage  
✅ Logical data separation  

---

**That's it! Single connection, multiple databases. Simple!** 🎯

