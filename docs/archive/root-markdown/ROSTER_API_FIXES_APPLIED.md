# Roster API Fixes Applied

## Issues Fixed

### 1. Store Code Handling (INVALID_INPUT Error)
**Problem:** When storeId is passed as a store code string (e.g., "STORE-001"), Mongoose was trying to cast it as an ObjectId, causing CastError.

**Fix Applied:**
- Modified `getRosterSettings` to conditionally populate only when storeId is a valid ObjectId
- Modified `upsertRosterSettings` to handle both ObjectId and store code strings separately
- Modified `getEnhancedWeeklyRoster` to handle both ObjectId and store code strings separately
- Modified `createRoster` to handle both ObjectId and store code strings for store lookup

**Code Changes:**
```javascript
// Before: Using $or which causes Mongoose to try casting
const store = await Store.findOne({ 
  $or: [{ _id: storeId }, { code: storeId }] 
});

// After: Check ObjectId validity first, then query separately
let store;
if (mongoose.Types.ObjectId.isValid(storeId)) {
  store = await Store.findOne({ _id: storeId });
}
if (!store) {
  store = await Store.findOne({ code: storeId });
}
```

### 2. Employee Lookup Enhancement
**Problem:** Employee lookup was too strict and didn't handle variations in employeeId format.

**Fix Applied:**
- Enhanced employee lookup to try multiple field names and case variations
- Added fallback to search without tenantId for backward compatibility

**Code Changes:**
```javascript
// Enhanced employee lookup with multiple strategies
let employee = await User.findOne({ 
  $or: [
    { employeeId: employeeId },
    { employee_id: employeeId },
    { employeeId: employeeId.toUpperCase() },
    { employee_id: employeeId.toUpperCase() }
  ],
  tenantId 
});
```

### 3. Populate Query Fix
**Problem:** Populating `store` field when querying by `storeId` (string) could cause issues.

**Fix Applied:**
- Only populate `store` field when querying by ObjectId (not by store code string)

**Code Changes:**
```javascript
// Only populate if query.store is a valid ObjectId
let settingsQuery = RosterSettings.find(query);
if (query.store && mongoose.Types.ObjectId.isValid(query.store)) {
  settingsQuery = settingsQuery.populate('store', 'name code address phone');
}
const settings = await settingsQuery.lean();
```

## Files Modified

1. `microservices/hr-service/src/services/roster.service.js`
   - `getRosterSettings()` - Fixed store lookup
   - `upsertRosterSettings()` - Fixed store lookup
   - `getEnhancedWeeklyRoster()` - Fixed store lookup
   - `createRoster()` - Fixed store and employee lookup

## Testing

After deployment, test with:
- Store codes (strings): `STORE-001`, `STORE-002`, etc.
- Store ObjectIds: Valid MongoDB ObjectIds
- Employee IDs: Various formats (EMP-2026-969954, etc.)

## Status

✅ **Fixes Deployed** - All changes have been applied and deployed to production.

Note: If store codes don't exist in the database, APIs will return "Store not found" (404) instead of "Invalid _id" (400), which is the correct behavior.
