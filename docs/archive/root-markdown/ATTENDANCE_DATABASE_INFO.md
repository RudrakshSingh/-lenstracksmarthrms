# 📊 Attendance Service Database Information

## 🗄️ Database Details

### Database Name
**`attendance-db`** (Default)

The attendance service stores all data in a MongoDB database named **`attendance-db`**.

### Database Server
**AWS DocumentDB** (MongoDB-compatible)

- **Type**: AWS DocumentDB (MongoDB API compatible)
- **Connection**: Via `docdb-credentials` Kubernetes secret
- **Endpoint**: Retrieved from `MONGO_URI` environment variable

---

## 📋 Collections (Tables) in `attendance-db`

### 1. **`attendances`** (Main Collection)
Stores all attendance records.

**Schema Fields**:
- `employee` (ObjectId) - Reference to employee
- `employee_id` (String) - Employee ID (e.g., "VAIBHAV-218926")
- `store` (ObjectId) - Reference to store
- `store_code` (String) - Store code
- `date` (Date) - Attendance date
- `check_in_time` (Date) - Clock-in timestamp
- `check_out_time` (Date) - Clock-out timestamp
- `check_in_location` (Object) - GPS coordinates and address
- `check_out_location` (Object) - GPS coordinates and address
- `check_in_selfie` (Object) - Selfie image URL and metadata
- `check_out_selfie` (Object) - Selfie image URL and metadata
- `total_hours` (Number) - Total working hours
- `status` (String) - Status (present, absent, late, etc.)
- `geofence_status` (String) - Geofence validation status
- `logout_reason` (String) - Reason for logout (manual, auto_geofence, etc.)
- `notes` (String) - Additional notes
- `is_geofence_violation` (Boolean) - Geofence violation flag
- `is_selfie_verified` (Boolean) - Selfie verification flag
- `createdAt` (Date) - Record creation timestamp
- `updatedAt` (Date) - Record update timestamp

### 2. **`users`** (Employee Reference)
Lightweight employee reference (for attendance service).

**Schema Fields**:
- `employee_id` (String) - Employee ID
- `email` (String) - Employee email
- `name` (String) - Employee name

**Note**: Full employee data is stored in HR service database (`etelios`). This is just a reference.

### 3. **`stores`** (Store Reference)
Lightweight store reference (for attendance service).

**Schema Fields**:
- `name` (String) - Store name
- `code` (String) - Store code
- `coordinates` (Object) - Store GPS coordinates
- `geofenceRadius` (Number) - Geofence radius in meters

**Note**: Full store data is stored in HR service database (`etelios`). This is just a reference.

### 4. **`locationviolations`** (Security)
Stores geofence violations and security events.

**Schema Fields**:
- `violation_id` (String) - Unique violation ID
- `employee_id` (String) - Employee ID
- `violation_type` (String) - Type of violation
- `location` (Object) - GPS coordinates
- `timestamp` (Date) - Violation timestamp
- `details` (Object) - Additional violation details

### 5. **`locationhistories`** (Location Tracking)
Stores location history for security analysis.

**Schema Fields**:
- `employee_id` (String) - Employee ID
- `location` (Object) - GPS coordinates
- `timestamp` (Date) - Location timestamp
- `action_type` (String) - Action type (CLOCK_IN, CLOCK_OUT, etc.)

---

## 🔗 Database Connection Configuration

### Environment Variables

From `k8s/etelios-prod/attendance-service-deployment.yaml`:

```yaml
env:
  - name: MONGO_URI
    valueFrom:
      secretKeyRef:
        name: docdb-credentials
        key: endpoint
  - name: MONGO_USERNAME
    valueFrom:
      secretKeyRef:
        name: docdb-credentials
        key: username
  - name: MONGO_PASSWORD
    valueFrom:
      secretKeyRef:
        name: docdb-credentials
        key: password
```

### Database Name Logic

From `microservices/attendance-service/src/server.js`:

```javascript
// Default database name
let targetDbName = process.env.DB_NAME || process.env.MONGO_DB_NAME;

// If not set, use 'attendance-db'
if (!targetDbName || targetDbName.toLowerCase().includes('test')) {
  targetDbName = 'attendance-db';
}
```

**Result**: Database name is **`attendance-db`** (unless explicitly overridden).

---

## 📍 Connection String Format

The connection string is constructed as:

```
mongodb://<username>:<password>@<endpoint>/attendance-db?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```

Where:
- `<username>`: From `docdb-credentials` secret
- `<password>`: From `docdb-credentials` secret
- `<endpoint>`: AWS DocumentDB endpoint from `docdb-credentials` secret
- Database: `attendance-db`

---

## 🔄 Data Flow

### Attendance Data Flow

```
Frontend Request
    ↓
Attendance Service API
    ↓
MongoDB Connection (attendance-db)
    ↓
attendances Collection
```

### Employee/Store Data Flow

```
Attendance Service
    ↓
HR Service API Call (Internal)
    ↓
HR Service Database (etelios)
    ↓
employees/stores Collections
```

**Note**: Employee and store data is fetched from HR service via API calls, not stored in attendance-db.

---

## 📊 Database Statistics

To check database statistics:

```bash
# Connect to MongoDB (via kubectl exec)
kubectl exec -it <attendance-service-pod> -n etelios-prod -- mongosh

# Switch to attendance-db
use attendance-db

# Check collections
show collections

# Count documents
db.attendances.countDocuments()
db.locationviolations.countDocuments()
db.locationhistories.countDocuments()
```

---

## 🗂️ Database Structure Summary

```
attendance-db (MongoDB Database)
├── attendances (Main attendance records)
├── users (Employee references)
├── stores (Store references)
├── locationviolations (Security violations)
└── locationhistories (Location tracking history)
```

---

## 🔐 Security & Access

- **Database**: AWS DocumentDB (managed MongoDB)
- **Access**: Via Kubernetes secret (`docdb-credentials`)
- **Network**: Private (within AWS VPC)
- **Encryption**: TLS enabled
- **Backup**: Managed by AWS DocumentDB

---

## 📝 Important Notes

1. **Database Name**: `attendance-db` (hardcoded default)
2. **Connection**: AWS DocumentDB (MongoDB-compatible)
3. **Employee Data**: Stored in HR service database (`etelios`), not in attendance-db
4. **Store Data**: Stored in HR service database (`etelios`), not in attendance-db
5. **References**: Attendance service uses ObjectId references to employees/stores in HR service

---

## 🔍 Verification

To verify the database connection:

```bash
# Check service logs
kubectl logs -f deployment/attendance-service -n etelios-prod | grep -i "database\|mongo"

# Expected log output:
# ✅ attendance-service: MongoDB connected successfully
# database: attendance-db
# host: <documentdb-endpoint>
```

---

**Last Updated**: 2026-02-16  
**Database**: `attendance-db`  
**Server**: AWS DocumentDB  
**Status**: ✅ Production Ready
