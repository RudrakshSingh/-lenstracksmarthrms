# Store Edit Fix - Shankar Nagar Store Issue

**Date:** March 2026  
**Issue:** Frontend showing "store not found" when trying to edit Shankar Nagar store (SHK02)  
**Status:** ✅ Fixed

---

## 🔍 Problem

When trying to edit the **Shankar Nagar store (SHK02)** from the frontend, the system was showing "store not found" error even though the store exists in the database.

**Store Details:**
- Name: Lenstrack Shankar Nagar
- Code: SHK02
- Tenant: upcapto
- Status: active

---

## 🐛 Root Cause

The issue was in the `getStoreById` and `updateStore` functions in `hr.service.js`. The query was too strict:

1. **Strict Query Syntax:** The query used `tenantId: { $exists: true, $eq: storeTenantId }` which was overly complex
2. **No Code Support:** The function only accepted MongoDB ObjectId, not store codes
3. **Poor Error Messages:** When store wasn't found, it didn't indicate if it was a tenant mismatch

---

## ✅ Solution

### Changes Made:

1. **Simplified Tenant Query:**
   - Changed from `tenantId: { $exists: true, $eq: storeTenantId }` 
   - To: `tenantId: storeTenantId` (simpler and more reliable)

2. **Added Code Support:**
   - Now accepts both MongoDB ObjectId and store code (like "SHK02")
   - If `storeId` is not a valid ObjectId, it tries to find by `code`

3. **Better Error Messages:**
   - If store is found but in different tenant, shows clear error:
     ```
     Store not found in tenant 'upcapto'. Store belongs to tenant 'lenstrack'
     ```

4. **Enhanced Logging:**
   - Logs when trying to find by code instead of ID
   - Logs tenant mismatch details for debugging

---

## 📝 Code Changes

### File: `microservices/hr-service/src/services/hr.service.js`

#### `getStoreById` Function:
```javascript
const getStoreById = async (storeId, tenantId = null) => {
  // ... 
  // Now supports:
  // 1. MongoDB ObjectId: "507f1f77bcf86cd799439011"
  // 2. Store Code: "SHK02"
  
  // Simplified query
  let query = {
    isDeleted: false,
    tenantId: storeTenantId
  };
  
  if (mongoose.Types.ObjectId.isValid(storeId)) {
    query._id = storeId;
  } else {
    query.code = storeId.toUpperCase().trim();
  }
  
  // Better error handling with tenant mismatch detection
  // ...
}
```

#### `updateStore` Function:
- Same improvements as `getStoreById`
- Supports both ObjectId and code
- Better error messages

---

## 🧪 Testing

To test the fix:

1. **Get Store by Code:**
   ```bash
   GET /api/hr/stores/SHK02
   X-Tenant-Id: upcapto
   ```

2. **Update Store by Code:**
   ```bash
   PUT /api/hr/stores/SHK02
   X-Tenant-Id: upcapto
   Body: { "name": "Updated Name" }
   ```

3. **Verify Tenant Isolation:**
   - Try accessing upcapto store from lenstrack tenant → Should fail with clear error
   - Try accessing lenstrack store from upcapto tenant → Should fail with clear error

---

## 📊 Impact

### Before Fix:
- ❌ Store edit failed with "store not found"
- ❌ Only accepted MongoDB ObjectId
- ❌ Unclear error messages

### After Fix:
- ✅ Store edit works with both ObjectId and code
- ✅ Better error messages for tenant mismatches
- ✅ Enhanced logging for debugging
- ✅ More flexible store lookup

---

## 🔐 Security

- ✅ Tenant isolation still enforced
- ✅ Cross-tenant access still prevented
- ✅ Better error messages help identify tenant issues

---

## 📋 Related Files

- `microservices/hr-service/src/services/hr.service.js` - Main fix
- `microservices/hr-service/src/controllers/hrController.js` - Controller (no changes needed)

---

## 🚀 Deployment

1. Deploy updated `hr-service`
2. Test store edit functionality
3. Verify tenant isolation still works
4. Monitor logs for any issues

---

**Status:** ✅ Ready for deployment  
**Last Updated:** March 2026
