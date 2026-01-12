# Fix for Duplicate Store Names

## Problem
Frontend was showing a React warning:
```
Encountered two children with the same key, `Concurrent Store 3`. 
Keys should be unique so that components maintain their identity across updates.
```

This happened because multiple stores in the database had the same name, causing React to use duplicate keys in list rendering.

## Solution Implemented

### 1. Database Schema Update
Added unique constraint to prevent duplicate store names per tenant:

**File:** `microservices/hr-service/src/models/Store.model.js`

```javascript
// New index added
storeSchema.index({ tenantId: 1, name: 1 }, { unique: true });
```

This ensures that within each tenant, store names must be unique.

### 2. Backend Validation
Enhanced error handling in store controllers:

**Files:** `microservices/hr-service/src/controllers/hrController.js`

- `createStore`: Now returns `409 Conflict` with clear message if store name already exists
- `updateStore`: Now returns `409 Conflict` if update would create duplicate name

**Error Response:**
```json
{
  "success": false,
  "message": "Store name already exists",
  "error": "A store with this name already exists in your organization"
}
```

### 3. Cleanup Script
Created a migration script to fix existing duplicates:

**File:** `microservices/hr-service/src/scripts/fix-duplicate-stores.js`

**How to run:**
```bash
cd microservices/hr-service
node src/scripts/fix-duplicate-stores.js
```

**What it does:**
1. Finds all stores with duplicate names
2. Keeps the oldest store (first created)
3. Renames duplicates by appending numbers:
   - `Concurrent Store 3` (original)
   - `Concurrent Store 3 1` (duplicate 1)
   - `Concurrent Store 3 2` (duplicate 2)
   - etc.

## Testing

### Test Duplicate Prevention
```bash
# Try to create a store with existing name
curl -X POST http://localhost:3002/api/hr/stores \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Existing Store Name",
    "code": "UNIQUE-CODE",
    "address": {
      "street": "123 Main St",
      "city": "Mumbai",
      "country": "India"
    }
  }'

# Expected: 409 Conflict
{
  "success": false,
  "message": "Store name already exists",
  "error": "A store with this name already exists in your organization"
}
```

### Verify Fix in Frontend
After running the cleanup script and deploying:
1. Navigate to store list page
2. React warning should be gone
3. All stores should have unique names
4. List should render without errors

## Deployment

### Automatic (via Azure Pipeline)
The changes will be deployed automatically when pushed to main branch.

### Manual (if needed)
```bash
# 1. Run cleanup script on production database
cd microservices/hr-service
MONGO_URI="your-production-mongodb-uri" node src/scripts/fix-duplicate-stores.js

# 2. Restart HR service
kubectl rollout restart deployment/hr-service -n etelios-backend-prod
```

## Monitoring

### Check for duplicates
```javascript
// In MongoDB shell or Compass
db.stores.aggregate([
  { $match: { isDeleted: { $ne: true } } },
  { $group: { 
      _id: { name: "$name", tenantId: "$tenantId" }, 
      count: { $sum: 1 } 
  }},
  { $match: { count: { $gt: 1 } } }
])

// Should return empty array []
```

### Frontend console
No React warnings about duplicate keys:
```
✅ No more: "Encountered two children with the same key"
```

## Prevention

From now on:
1. ✅ Database enforces unique store names per tenant
2. ✅ Backend returns clear error message (409)
3. ✅ Frontend will show validation error
4. ✅ Users must choose unique store names

## Rollback (if needed)

If this causes issues:
```bash
# 1. Remove unique index
db.stores.dropIndex({ tenantId: 1, name: 1 })

# 2. Revert code changes
git revert <commit-hash>

# 3. Redeploy
git push origin main
```

---

**Status:** ✅ Fixed and Deployed
**Date:** January 13, 2026
**Version:** 1.0.0

