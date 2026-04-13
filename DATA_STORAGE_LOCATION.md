# Frontend Data Storage Location

## User Data Storage

### Database Details:
- **Database Name**: `etelios`
- **Collection Name**: `users`
- **Model**: `User` (from `microservices/auth-service/src/models/User.model.js`)
- **Database Type**: AWS DocumentDB (MongoDB-compatible)
- **Connection**: TLS enabled

### Storage Flow:
1. **Frontend** → Sends user data to API
2. **API Endpoint**: `POST /api/auth/register` (auth-service)
3. **Controller**: `authController.register()` → `authService.register()`
4. **Service**: Creates `User` model instance and calls `user.save()`
5. **Database**: Saves to `etelios.users` collection in DocumentDB

### User Model Schema:
- `tenantId` (required, indexed)
- `employee_id` (required, unique per tenant)
- `email` (required, unique per tenant, lowercase)
- `name` (required)
- `role` (required: 'superadmin', 'admin', 'hr', 'manager', 'employee', etc.)
- `department` (required)
- `password` (hashed with bcrypt)
- `tenantId` + `employee_id` → Compound unique index
- `tenantId` + `email` → Compound unique index

### Connection String:
- Uses `MONGODB_URI` or `MONGO_URI` environment variable
- DocumentDB connection string format: `mongodb://username:password@docdb-cluster.region.docdb.amazonaws.com:27017/etelios?tls=true`
- Database name is specified in connection string or defaults to `etelios`

### To Update User Roles:
1. Connect to DocumentDB with proper TLS
2. Use database: `etelios`
3. Use collection: `users`
4. Query by: `{ email: 'user@example.com', tenantId: 'tenant_id' }`
5. Update: `{ $set: { role: 'manager' } }`
