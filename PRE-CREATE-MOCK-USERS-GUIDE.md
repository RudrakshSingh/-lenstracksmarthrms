# Pre-Create Mock Users - Fix 408 Timeout

## Why Pre-Create Mock Users?

The 408 timeout is happening because the mock login endpoint needs to:
1. Query database for existing user
2. Create new user if not found (database write - SLOW)
3. Hash password (CPU intensive)
4. Save to database (another write)

**Pre-creating users eliminates steps 2-4**, making the endpoint read-only and much faster (<2 seconds).

## How to Pre-Create Mock Users

### Option 1: Run on Azure App Service (Recommended)

1. **Access Azure App Service Console**
   - Go to Azure Portal
   - Navigate to your App Service: `etelios-auth-service-h8btakd4byhncmgc`
   - Go to **Development Tools** → **SSH** or **Console**
   - Or use **Advanced Tools (Kudu)** → **Debug console** → **CMD**

2. **Run the Script**
   ```bash
   cd /home/site/wwwroot
   node scripts/pre-create-mock-users.js
   ```

3. **Verify**
   The script will output:
   ```
   ✓ Created mock user: mock.hr@etelios.com
   ✓ Created mock user: mock.admin@etelios.com
   ...
   === Summary ===
   Created: 5 users
   Updated: 0 users
   Total: 5 mock users ready
   ```

### Option 2: Run Locally (if you have DB access)

```bash
cd microservices/auth-service
# Set your MONGO_URI environment variable
export MONGO_URI="your-azure-mongodb-connection-string"
node scripts/pre-create-mock-users.js
```

### Option 3: Add to Deployment Pipeline

Add this as a post-deployment step in your Azure Pipeline:

```yaml
- script: |
    cd $(System.DefaultWorkingDirectory)/microservices/auth-service
    node scripts/pre-create-mock-users.js
  displayName: 'Pre-create Mock Users'
  env:
    MONGO_URI: $(mongo-uri)
```

## What the Script Does

1. Connects to MongoDB
2. Creates/updates mock users for all roles:
   - `mock.hr@etelios.com` (HR role)
   - `mock.admin@etelios.com` (Admin role)
   - `mock.manager@etelios.com` (Manager role)
   - `mock.employee@etelios.com` (Employee role)
   - `mock.superadmin@etelios.com` (Super Admin role)
3. Uses pre-hashed passwords (fast)
4. Sets all required fields

## After Pre-Creating Users

The mock login endpoint will:
- ✅ Only read from database (fast)
- ✅ Complete in <2 seconds
- ✅ No 408 timeout errors
- ✅ Works with caching (even faster)

## Test After Pre-Creation

```bash
curl -X POST "https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/api/auth/mock-login" \
  -H "Content-Type: application/json" \
  -d '{"role":"hr"}' \
  --max-time 10
```

**Expected**: Status 200, response time <2 seconds

## Troubleshooting

### Script Fails to Connect
- Check `MONGO_URI` environment variable
- Verify MongoDB is accessible from App Service
- Check network/firewall rules

### Users Already Exist
- Script will update existing users (safe to run multiple times)
- No duplicate users will be created

### Permission Errors
- Ensure App Service has write access to database
- Check MongoDB user permissions

## Alternative: Manual Creation

If script doesn't work, you can manually create users via MongoDB:

```javascript
// Connect to MongoDB and run:
db.users.insertMany([
  {
    tenantId: 'default',
    employee_id: 'MOCKHR001',
    name: 'Mock HR User',
    email: 'mock.hr@etelios.com',
    password: '$2a$04$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    role: 'hr',
    department: 'HR',
    designation: 'HR Manager',
    is_active: true,
    status: 'active',
    // ... other required fields
  },
  // ... repeat for other roles
]);
```

## Status

Once mock users are pre-created, the 408 timeout issue should be **completely resolved**.

