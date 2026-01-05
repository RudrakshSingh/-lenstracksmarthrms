# Ingress 404 Error Fix

## Problem
- **404 Error**: Accessing `https://api.etelios.com` returns 404
- **Root Cause**: Ingress doesn't have a root path (`/`) handler

## Issue Analysis
The ingress configuration only has paths like:
- `/api/auth`
- `/api/hr`
- `/api/attendance`
- etc.

But **no route for root path** (`/`), so accessing `https://api.etelios.com` directly returns 404.

## Fix Applied
Added root path handlers to both ingress rules:

```yaml
# Health check endpoint (root level)
- path: /
  pathType: Prefix
  backend:
    service:
      name: auth-service
      port:
        number: 3001
- path: /health
  pathType: Exact
  backend:
    service:
      name: auth-service
      port:
        number: 3001
```

## Testing
After applying the fix:

1. **Root path**: `https://api.etelios.com/` should work
2. **Health check**: `https://api.etelios.com/health` should work
3. **API endpoints**: `https://api.etelios.com/api/auth/login` should work

## Next Steps
1. Apply the updated ingress configuration:
   ```bash
   kubectl apply -f k8s/ingress.yaml
   ```
2. Verify the ingress is updated:
   ```bash
   kubectl get ingress -n etelios-backend-prod
   kubectl describe ingress etelios-ingress -n etelios-backend-prod
   ```
3. Test the endpoints:
   ```bash
   curl https://api.etelios.com/
   curl https://api.etelios.com/health
   curl https://api.etelios.com/api/auth/login
   ```

---

**Status**: Fix applied to ingress.yaml. Need to deploy to Kubernetes.

