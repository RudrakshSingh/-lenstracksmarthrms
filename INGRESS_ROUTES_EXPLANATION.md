# 🔍 Ingress Routes Explanation

## ✅ Current Configuration

**File:** `k8s/ingress-alb-fixed.yaml`

### Routes Configured:

1. **`/api/hr` (Prefix)** - This handles ALL `/api/hr/*` routes:
   - ✅ `/api/hr/stores` → Should work (via prefix)
   - ✅ `/api/hr/departments` → Should work (via prefix)
   - ✅ `/api/hr/employees` → Should work (via prefix)
   - ✅ `/api/hr/onboarding` → Should work (via prefix)
   - ✅ `/api/hr/roster` → Should work (via prefix)
   - ✅ `/api/hr/roles` → Should work (via prefix)
   - ✅ All other `/api/hr/*` routes

2. **Other Routes:**
   - ✅ `/api/auth` → auth-service
   - ✅ `/api/attendance` → attendance-service
   - ✅ `/api/documents` → document-service
   - ✅ `/api/admin` → tenant-registry-service
   - ✅ `/api/platform` → tenant-registry-service
   - ✅ `/api/system` → tenant-registry-service
   - ✅ `/api/tenant` → tenant-registry-service
   - ✅ `/api/tenants` → tenant-registry-service

---

## 🔍 Why 404 Errors?

If `/api/hr/stores` returns 404, it could be:

1. **Service doesn't have the endpoint** - hr-service might not expose `/stores`
2. **Path rewriting needed** - Service might expect different path
3. **Ingress not updated** - Need to apply ingress again

---

## 🚀 Apply Ingress

```bash
kubectl apply -f k8s/ingress-alb-fixed.yaml
```

---

## 🔍 Check Service Endpoints

To verify if services have these endpoints:

```bash
# Check hr-service endpoints
kubectl get endpoints hr-service -n etelios-prod

# Port-forward and test
kubectl port-forward -n etelios-prod svc/hr-service 3002:3002
curl http://localhost:3002/api/hr/stores
```

---

## 📋 Routes Status

| Route | Ingress Config | Service | Status |
|-------|---------------|---------|--------|
| `/api/hr/*` | ✅ Prefix route | hr-service:3002 | Should work |
| `/api/hr/stores` | ✅ Via prefix | hr-service | Depends on service |
| `/api/hr/departments` | ✅ Via prefix | hr-service | Depends on service |
| `/api/hr/employees` | ✅ Via prefix | hr-service | Depends on service |
| `/api/hr/roster` | ✅ Via prefix | hr-service | Depends on service |
| `/api/documents` | ✅ Direct route | document-service | Should work |
| `/api/admin` | ✅ Direct route | tenant-registry | Should work |
| `/api/platform` | ✅ Direct route | tenant-registry | Should work |
| `/api/system` | ✅ Direct route | tenant-registry | Should work |

---

## ✅ Solution

**The ingress routes ARE configured correctly!**

The `/api/hr` prefix route should handle all `/api/hr/*` requests.

**If still getting 404:**
1. Apply ingress: `kubectl apply -f k8s/ingress-alb-fixed.yaml`
2. Wait 2-5 minutes for ALB to update
3. Check if services have these endpoints
4. Test again

---

**Ingress file is fixed! Apply it now!**
