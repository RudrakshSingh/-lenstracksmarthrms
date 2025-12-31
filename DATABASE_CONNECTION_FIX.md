# Database Connection Issue - Users Only Visible in Test DB

## Problem
Users created during testing are only visible in the test database, not in the main production database.

## Root Cause
The MongoDB connection string (`MONGO_URI`) is missing the database name. When a connection string doesn't specify a database name, MongoDB may:
1. Connect to the default database
2. Use the first available database
3. Create/use a database based on the connection context

## Solution

### Option 1: Add Database Name to Connection String (Recommended)
Update your `MONGO_URI` environment variable to include the database name:

**Before:**
```
mongodb+srv://user:password@host.mongodb.net/?appName=hrms
```

**After:**
```
mongodb+srv://user:password@host.mongodb.net/etelios_hr_service?appName=hrms
```

### Option 2: Use DB_NAME Environment Variable
Set the `DB_NAME` environment variable:
```bash
export DB_NAME=etelios_hr_service
```

The code has been updated to automatically append the database name from `DB_NAME` if it's not in the connection string.

## How to Check Current Database

Run the diagnostic script:
```bash
node scripts/check-database-connection.js
```

This will show:
- Which database you're currently connected to
- Connection string (with password masked)
- Collections in the database
- Number of users in the database

## Code Changes Made

1. **Enhanced Database Connection Logging** (`server.js`):
   - Added detailed logging of database name, host, and port
   - Added warning if database name contains "test"
   - Added masked connection string in logs

2. **Automatic Database Name Handling**:
   - If `DB_NAME` or `MONGO_DB_NAME` is set, it will be added to the connection string
   - If no database name is in the URI, defaults to `etelios_hr_service`
   - Logs warnings when using default database name

## Next Steps

1. **Check your current connection**:
   ```bash
   node scripts/check-database-connection.js
   ```

2. **Update MONGO_URI** to include database name:
   ```bash
   # In your .env file or environment variables
   MONGO_URI=mongodb+srv://user:password@host.mongodb.net/etelios_hr_service?appName=hrms
   ```

3. **Or set DB_NAME environment variable**:
   ```bash
   DB_NAME=etelios_hr_service
   ```

4. **Restart the HR service** to apply changes

5. **Verify connection** by checking the logs - you should see:
   ```
   hr-service: MongoDB connected successfully
   database: etelios_hr_service
   ```

## Important Notes

- **Production Database**: Should be `etelios_hr_service` or `etelios_hrms`
- **Test Database**: Usually `etelios_hr_service_test` or `test_hr_service`
- Always verify the database name in logs after restarting the service
- The service will now warn you if it detects a "test" database name

