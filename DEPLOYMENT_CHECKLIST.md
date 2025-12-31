# Deployment Checklist - All New Endpoints
## Server Restart Required

**Date:** 2025-01-XX  
**Status:** ✅ All Code Complete - ⚠️ Server Restart Required

---

## ✅ Code Status

All endpoints have been created and properly registered:

### Routes Registered in `server.js`:
- ✅ Dashboard routes (`dashboard.routes.js`)
- ✅ Benefits routes (`benefits.routes.js`)
- ✅ Training routes (`training.routes.js`)
- ✅ Performance routes (`performance.routes.js`)
- ✅ Roster routes (`roster.routes.js`)
- ✅ Time Tracking routes (`timeTracking.routes.js`)
- ✅ Recruitment routes (`recruitment.routes.js`)

### Files Created:
- ✅ 8 new models
- ✅ 7 new controllers
- ✅ 7 new route files
- ✅ 11 files modified

---

## 🚀 Deployment Steps

### 1. **Restart HR Service** (REQUIRED)

The production server needs to be restarted to load all new routes:

```bash
# Option 1: PM2
pm2 restart hr-service

# Option 2: Docker
docker-compose restart hr-service

# Option 3: Systemd
systemctl restart hr-service

# Option 4: Kubernetes
kubectl rollout restart deployment/hr-service
```

### 2. **Verify Server Started Successfully**

Check server logs for:
```
✅ dashboard.routes.js loaded successfully
✅ benefits.routes.js loaded successfully
✅ training.routes.js loaded successfully
✅ performance.routes.js loaded successfully
✅ roster.routes.js loaded successfully
✅ timeTracking.routes.js loaded successfully
✅ recruitment.routes.js loaded successfully
```

### 3. **Verify Routes Are Accessible**

Test a few endpoints:
```bash
# Health check
curl -H "Authorization: Bearer {token}" https://98.70.245.87/api/hr/health

# Dashboard stats
curl -H "Authorization: Bearer {token}" https://98.70.245.87/api/hr/dashboard/stats

# Benefits list
curl -H "Authorization: Bearer {token}" https://98.70.245.87/api/hr/benefits
```

### 4. **Run Full Test Suite**

```bash
node scripts/test-new-endpoints.js
```

---

## 📊 Expected Test Results After Restart

### Before Restart (Current):
- ❌ Most endpoints: 404 (Route not found)
- ✅ Authentication: Working
- ✅ Some existing endpoints: Working

### After Restart (Expected):
- ✅ Dashboard endpoints: 200 (with proper auth)
- ✅ Benefits endpoints: 200 (with proper auth)
- ✅ Training endpoints: 200 (with proper auth)
- ✅ Performance endpoints: 200 (with proper auth)
- ✅ Roster endpoints: 200 (with proper auth)
- ✅ Time Tracking endpoints: 200 (with proper auth)
- ✅ Recruitment endpoints: 200 (with proper auth)
- ⚠️ Some endpoints: 403 (permission issues - expected with wrong role)

---

## 🔍 Verification Commands

### Check Route Loading
```bash
# Check server logs
tail -f /var/log/hr-service.log | grep "routes loaded"

# Check endpoint list
curl https://98.70.245.87/api/hr
```

### Test Authentication
```bash
# Mock login
curl -X POST https://98.70.245.87/api/auth/mock-login \
  -H "Content-Type: application/json" \
  -d '{"role": "hr"}'
```

### Test New Endpoints
```bash
# Get token first
TOKEN=$(curl -s -X POST https://98.70.245.87/api/auth/mock-login \
  -H "Content-Type: application/json" \
  -d '{"role": "hr"}' | jq -r '.data.data.accessToken')

# Test dashboard
curl -H "Authorization: Bearer $TOKEN" \
  https://98.70.245.87/api/hr/dashboard/stats

# Test benefits
curl -H "Authorization: Bearer $TOKEN" \
  https://98.70.245.87/api/hr/benefits
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: Routes Still Returning 404
**Solution:** 
- Verify server restarted successfully
- Check server logs for route loading errors
- Verify route files exist in correct location
- Check for syntax errors in route files

### Issue 2: 403 Forbidden Errors
**Solution:**
- This is expected - endpoints require proper roles/permissions
- Use token with correct role (hr, admin, manager)
- Check RBAC middleware configuration

### Issue 3: 500 Internal Server Error
**Solution:**
- Check server logs for detailed error
- Verify database models are properly indexed
- Check for missing dependencies
- Verify all required environment variables are set

### Issue 4: Database Connection Errors
**Solution:**
- Verify MongoDB connection string
- Check database is accessible
- Verify network connectivity

---

## 📝 Post-Deployment Checklist

- [ ] Server restarted successfully
- [ ] All routes loaded (check logs)
- [ ] Health check returns 200
- [ ] Dashboard endpoints working
- [ ] Benefits endpoints working
- [ ] Training endpoints working
- [ ] Performance endpoints working
- [ ] Roster endpoints working
- [ ] Time Tracking endpoints working
- [ ] Recruitment endpoints working
- [ ] Alias routes working
- [ ] Authentication working
- [ ] RBAC working correctly
- [ ] Error handling working
- [ ] All tests passing

---

## 🎯 Success Criteria

After deployment, you should see:
1. ✅ All new endpoints returning 200 (with proper auth)
2. ✅ No 404 errors for new routes
3. ✅ Proper error messages for invalid requests
4. ✅ RBAC working correctly
5. ✅ Database operations working
6. ✅ Frontend can successfully call all endpoints

---

**Next Action:** Restart the HR service on production server

