# Quick Local Test with Main Database

## Steps to Test Locally

### 1. Set Environment Variables
```bash
cd microservices/hr-service

# Your connection string (from .env) doesn't have database name
# The code will automatically add 'etelios_hr_service' (MAIN DB)
export MONGO_URI="mongodb+srv://rudrakshsin3006:rudi%403006@hrms.zbz0wva.mongodb.net/?appName=hrms"
export DB_NAME=etelios_hr_service
export PORT=3002
```

### 2. Start HR Service
```bash
cd microservices/hr-service
npm start
```

**Watch the logs** - you should see:
```
hr-service: MongoDB connected successfully
database: etelios_hr_service  ← MAIN database
```

If you see any database name with "test" in it, the code will automatically replace it.

### 3. Run Test (in another terminal)
```bash
# Simple test
node scripts/test-local-simple.js

# Full workflow test
node scripts/test-full-hr-workflow.js --local
```

## What Gets Tested

1. ✅ Employee Creation - Creates in MAIN database
2. ✅ Onboarding Steps 1-7 - All onboarding APIs
3. ✅ HR APIs - Employees, Departments, Dashboard, Payroll, etc.

## Verification

After test completes:
- Check server logs: `database: etelios_hr_service`
- Employee should appear in `/api/hr/employees` list
- All data goes to MAIN database, not test

## Code Changes Made

1. **Database Name**: Always uses `etelios_hr_service` (main DB)
2. **Employee Creation**: Fixed fullName validation
3. **Validation**: Doesn't strip unknown fields anymore

