# 🔧 DOCUMENT ROUTE 404 - DEBUGGING GUIDE

**Date:** January 14, 2026  
**Status:** ⚠️ Still 404 in Production | ✅ Enhanced Logging Added

---

## ❌ **CURRENT ISSUE:**

### **Production Test Results:**
- `GET /api/documents/health` → 404 (Route not found)
- `GET /api/hr/documents/health` → 401 (Auth required - route exists but needs auth)
- `POST /api/documents/upload` → 404 (Route not found)
- `POST /api/hr/documents/upload` → 404 (Route not found)

### **Analysis:**
- `/api/documents/*` → Going to **auth-service** (wrong service!)
- `/api/hr/documents/*` → Going to **hr-service** but route not registered

---

## ✅ **FIXES APPLIED:**

### **1. Removed Unused Logger Import:**
**File:** `microservices/hr-service/src/routes/document.routes.js`

**Change:**
- Removed `const logger = require('../config/logger');` (not used)

### **2. Enhanced Route Loading Error Handling:**
**File:** `microservices/hr-service/src/server.js`

**Changes:**
- Added explicit route verification before mounting
- Added console.log for immediate visibility
- Better error messages with stack traces
- Verifies route count > 0 before mounting

**New Code:**
```javascript
// Verify routes are registered
const routeCount = documentRoutes.stack ? documentRoutes.stack.length : 0;
if (routeCount === 0) {
  throw new Error('document.routes.js has no routes registered');
}

// Log to console for immediate visibility
console.log('✅ document.routes.js loaded:', routeCount, 'routes');
console.log('   Routes:', routeList.join(', '));
```

---

## 🔍 **DEBUGGING STEPS:**

### **1. Check Production Logs:**

```bash
# Check if document routes loaded
kubectl logs -l app=hr-service --tail=200 | grep -i document

# Look for:
# ✅ "document.routes.js loaded successfully"
# ❌ "document.routes.js failed to load"
```

### **2. Check Route Registration:**

Look for these log messages:
```
✅ document.routes.js loaded: 5 routes
   Routes: GET /health, POST /upload, GET /, GET /:employeeId, DELETE /:documentId
```

### **3. Check for Errors:**

Look for:
```
❌ document.routes.js failed to load: <error message>
```

### **4. Verify Service Restart:**

```bash
# Check deployment status
kubectl get pods -l app=hr-service

# Restart if needed
kubectl rollout restart deployment/hr-service

# Watch logs during restart
kubectl logs -f -l app=hr-service | grep -i document
```

---

## 🎯 **POSSIBLE CAUSES:**

### **1. Route File Not Loading:**
- Syntax error in route file
- Missing dependency (documentController, middleware)
- Import error

### **2. Route Registration Failing:**
- Error in route mounting
- Middleware conflict
- Route order issue

### **3. Service Not Restarted:**
- Old code still running
- Deployment didn't complete
- Pod not restarted

### **4. Gateway/Ingress Issue:**
- `/api/documents` routing to wrong service
- Ingress rules incorrect
- Service discovery issue

---

## 🔧 **NEXT STEPS:**

### **1. Wait for Pipeline:**
- Pipeline should deploy new code
- Service will restart automatically

### **2. Check Logs:**
```bash
kubectl logs -l app=hr-service --tail=500 | grep -A 10 -B 10 document
```

### **3. Verify Route Registration:**
- Look for "document.routes.js loaded successfully"
- Check route count (should be 5)
- Verify routes list

### **4. Test Again:**
```bash
./test-document-route-fix.sh
```

### **5. If Still 404:**
- Check if route file exists in container
- Verify documentController loads
- Check middleware imports
- Verify no syntax errors

---

## 📋 **EXPECTED LOG OUTPUT:**

### **On Successful Load:**
```
Loading document.routes.js...
✅ document.routes.js loaded: 5 routes
   Routes: GET /health, POST /upload, GET /, GET /:employeeId, DELETE /:documentId
[INFO] document.routes.js loaded successfully {
  paths: ['/api/documents', '/api/hr/documents'],
  routeCount: 5,
  routes: ['GET /health', 'POST /upload', 'GET /', 'GET /:employeeId', 'DELETE /:documentId']
}
```

### **On Failure:**
```
Loading document.routes.js...
❌ document.routes.js failed to load: <error message>
   Stack: <stack trace>
[ERROR] document.routes.js failed to load {
  error: '<error message>',
  stack: '<stack trace>',
  details: 'Check route file syntax and dependencies'
}
```

---

## ✅ **FILES CHANGED:**

1. ✅ `microservices/hr-service/src/routes/document.routes.js`
   - Removed unused logger import

2. ✅ `microservices/hr-service/src/server.js`
   - Enhanced route loading with verification
   - Added console.log for visibility
   - Better error handling

---

## 🎯 **STATUS:**

| Item | Status |
|------|--------|
| **Code Fix** | ✅ Complete |
| **Enhanced Logging** | ✅ Added |
| **Error Handling** | ✅ Improved |
| **Pipeline** | ⏳ Deploying |
| **Production Test** | ⏳ Pending |

---

## 📝 **ACTION REQUIRED:**

1. ⏳ Wait for pipeline to complete
2. ⏳ Check production logs for route loading
3. ⏳ Verify route registration in logs
4. ⏳ Test document upload endpoint
5. ⏳ If still 404, check logs for specific error

---

**✅ Enhanced logging added! Check production logs after pipeline completes!**

