# Local Testing with Main Database

## Setup

### 1. Set Environment Variables
```bash
export MONGO_URI="your_main_database_connection_string"
export DB_NAME=etelios_hr_service
export MONGO_DB_NAME=etelios_hr_service
```

**Important**: Make sure the connection string points to MAIN database, not test database.

### 2. Start HR Service Locally
```bash
cd microservices/hr-service
npm start
```

The service will:
- Connect to the database specified in MONGO_URI
- Use `etelios_hr_service` as database name (main production DB)
- Automatically replace any "test" database names with main DB
- Log the actual database name it's connected to

### 3. Check Database Connection in Logs
Look for this in the logs:
```
hr-service: MongoDB connected successfully
database: etelios_hr_service  ← Should be MAIN DB, NOT test
```

If you see a database name with "test" in it, the code will automatically replace it.

### 4. Run Tests
```bash
# Simple test (just create employee)
node scripts/test-local-simple.js

# Full workflow test (create + onboard + test APIs)
node scripts/test-full-hr-workflow.js --local
```

## What the Code Does

1. **Database Name Detection**: 
   - Checks if database name is in connection string
   - If missing, adds `etelios_hr_service`
   - If contains "test", replaces with `etelios_hr_service`

2. **Logging**:
   - Shows actual database name being used
   - Warns if database name contains "test"

3. **Validation**:
   - Employee creation now handles fullName correctly
   - Creates fullName from firstName + lastName if not provided
   - Validates only email and department (fullName is created automatically)

## Verification

After creating an employee, check:
1. Server logs show: `database: etelios_hr_service`
2. Employee appears in `/api/hr/employees` list
3. Employee data is in MAIN database (check MongoDB directly if needed)

## Troubleshooting

If employees still go to test database:
1. Check MONGO_URI - make sure it doesn't point to test DB
2. Check server logs for actual database name
3. Verify DB_NAME environment variable is set to `etelios_hr_service`
4. Restart the service after setting environment variables

