# Production Employee Creation Test

## Status
⚠️ **Production server needs to be updated with latest code**

## Test Script
Use: `node scripts/test-full-hr-workflow.js`

This script automatically detects environment:
- `--local` flag: Tests against `http://localhost:3002`
- No flag: Tests against `https://api.etelios.com` (production)

## Current Issue
Production server is returning:
- `"Missing required fields: fullName"` error

This suggests the production server hasn't been updated with the latest code that:
1. Makes `fullName` optional (can be generated from firstName + lastName)
2. Adds Employee collection sync
3. Fixes database connection to use main database

## Steps to Test After Deployment

1. **Wait for Azure DevOps Pipeline**
   - Pipeline should deploy latest code
   - Verify deployment is successful

2. **Run Production Test**
   ```bash
   node scripts/test-full-hr-workflow.js
   ```

3. **Verify Results**
   - Employee should be created successfully
   - Data should appear in `users` collection
   - Data should appear in `employees` collection
   - Both in `etelios_hr_service` database (main database)

## Expected Test Results

✅ Login successful
✅ Employee created successfully
✅ All 8 onboarding steps passed
✅ All 7 HR API tests passed
✅ Employee visible in Cosmos DB `employees` collection

## Manual Verification

After employee creation, verify in Cosmos DB:
- Database: `etelios_hr_service`
- Collection: `employees`
- Should see new employee document with:
  - `employeeId`
  - `fullName`
  - `designation`
  - `department`

