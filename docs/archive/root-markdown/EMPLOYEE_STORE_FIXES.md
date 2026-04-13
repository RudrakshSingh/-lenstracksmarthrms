# Employee & Store Fixes

## ✅ Issues Fixed

### 1. Employee Creation Not Working
**Problem**: Employee creation was failing from frontend repeatedly.

**Root Causes**:
- Store assignment was not setting `workLocation` field
- Store was not being populated in response
- Empty `storeId` was not handled correctly

**Fixes Applied**:
- ✅ Store assignment now sets both `store` field and `workLocation` object
- ✅ Employee response now includes populated store data
- ✅ Empty `storeId` is handled correctly (doesn't break creation)

**Files Modified**:
- `microservices/hr-service/src/services/hr.service.js` - `createEmployee` function
- `microservices/hr-service/src/controllers/hrController.js` - `createEmployee` controller

---

### 2. Store Not Showing in Dashboard
**Problem**: When store is created and assigned to employee, it's not showing in employee active dashboard.

**Root Causes**:
- Dashboard query was not populating store with all required fields
- Store name was not being extracted correctly from populated store

**Fixes Applied**:
- ✅ Dashboard query now populates store with `name`, `code`, `address`, `coordinates`
- ✅ Dashboard response includes store name from populated store or workLocation
- ✅ Store ID and code are included in dashboard response

**Files Modified**:
- `microservices/hr-service/src/services/dashboard.service.js` - `getUnifiedDashboard` function

---

### 3. Mock Store in Employee Edit
**Problem**: When editing employee, store shows "mock store" instead of actual DB store.

**Root Causes**:
- `formatEmployee` was not using populated store data correctly
- Store object was not being populated in update response
- Fallback to workLocation was not implemented

**Fixes Applied**:
- ✅ `formatEmployee` now uses real store data from populated store object
- ✅ Falls back to `workLocation` data if store is not populated
- ✅ Update response now includes populated store data
- ✅ Store update now updates both `store` field and `workLocation` object

**Files Modified**:
- `microservices/shared/utils/response.util.js` - `formatEmployee` function
- `microservices/hr-service/src/services/hr.service.js` - `updateEmployee` function
- `microservices/hr-service/src/controllers/hrController.js` - `updateEmployee` controller

---

## 🔧 Technical Details

### Store Assignment Flow

**During Employee Creation**:
```javascript
// Store is assigned
userData.store = store?._id;

// workLocation is set from store
if (store && store._id) {
  userData.workLocation = {
    storeId: store._id.toString(),
    storeName: store.name || '',
    city: store.address?.city || '',
    state: store.address?.state || '',
    pincode: store.address?.zip || ''
  };
}
```

**During Employee Update**:
```javascript
// Store is updated
if (storeId) {
  const store = await Store.findById(storeId);
  rest.store = store._id;
  
  // workLocation is updated
  rest.workLocation = {
    storeId: store._id.toString(),
    storeName: store.name || '',
    city: store.address?.city || '',
    state: store.address?.state || '',
    pincode: store.address?.zip || ''
  };
}
```

**In Response Formatting**:
```javascript
// Use populated store if available
store: storeObj ? {
  id: storeObj._id?.toString(),
  name: storeObj.name || 'Unknown Store',
  code: storeObj.code || '',
  address: storeObj.address || null
} : (emp.workLocation?.storeId ? {
  // Fallback to workLocation
  id: emp.workLocation.storeId,
  name: emp.workLocation.storeName || 'Unknown Store',
  code: '',
  address: null
} : null)
```

---

## 🧪 Testing

### Test Employee Creation with Store
```bash
curl -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/hr/employees" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "TEST-001",
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "department": "Sales",
    "storeId": "6991d1a31c60f69377f76a0c"
  }'
```

### Test Employee Update with Store
```bash
curl -X PUT "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/hr/employees/EMPLOYEE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto" \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": "6991d1a31c60f69377f76a0c"
  }'
```

### Test Dashboard Store Display
```bash
curl -X GET "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/hr/dashboard" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto"
```

---

## 📋 Checklist

- [x] Employee creation with store assignment
- [x] Store populated in employee response
- [x] Employee update with store assignment
- [x] Store populated in update response
- [x] Dashboard shows store name correctly
- [x] formatEmployee uses real store data
- [x] Empty storeId handled correctly
- [x] workLocation synced with store

---

## 🚀 Deployment

After applying these fixes, restart the HR service:

```bash
kubectl rollout restart deployment/hr-service -n etelios-prod
kubectl rollout status deployment/hr-service -n etelios-prod
```

---

**Status**: ✅ All fixes applied and ready for deployment
