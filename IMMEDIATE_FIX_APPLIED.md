# ✅ Immediate Fix Applied

## 🔧 Action Taken

**Restarted hr-service deployment** to reload routes.

```bash
kubectl rollout restart deployment/hr-service -n etelios-prod
```

---

## ⏱️ Wait Time

**Service restart:** 2-3 minutes

Wait for:
1. Old pods to terminate
2. New pods to start
3. Routes to register
4. Health checks to pass

---

## 🧪 Test After Restart

Wait 2-3 minutes, then test:

```bash
# Get token
TOKEN=$(curl -sk -X POST https://api.etelios.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lenstrack.com","password":"AdminPass123!"}' \
  | jq -r '.token')

# Test stores
curl -sk https://api.etelios.com/api/hr/stores \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: lenstrack"

# Test employees
curl -sk https://api.etelios.com/api/hr/employees \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: lenstrack"

# Test departments
curl -sk https://api.etelios.com/api/hr/departments \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: lenstrack"
```

---

## 📊 Expected Result

After restart, routes should work:
- ✅ `/api/hr/stores` → 200 with data
- ✅ `/api/hr/employees` → 200 with data
- ✅ `/api/hr/departments` → 200 with data

---

## 🔍 If Still Not Working

1. **Check service logs:**
   ```bash
   kubectl logs -n etelios-prod -l app=hr-service --tail=50
   ```

2. **Check route registration:**
   Look for "hr.routes.js loaded successfully" in logs

3. **Verify service version:**
   ```bash
   kubectl get deployment hr-service -n etelios-prod -o jsonpath='{.spec.template.spec.containers[0].image}'
   ```

---

**Wait 2-3 minutes, then test again!**
