# How to Get Pod Names in AKS

## Quick Commands

### 1. Get HR Service Pod Names (Production)
```bash
kubectl get pods -n etelios-backend-prod | grep hr-service
```

**Output will look like:**
```
hr-service-7d8f9c4b5-abc12   1/2   Running   0   3d
hr-service-7d8f9c4b5-xyz34   0/2   CrashLoopBackOff   5   3d
```

**Pod names:** `hr-service-7d8f9c4b5-abc12`, `hr-service-7d8f9c4b5-xyz34`

### 2. Get HR Service Pod Names (Development)
```bash
kubectl get pods -n etelios-backend-dev | grep hr-service
```

### 3. Get Pod Name Using Label Selector
```bash
kubectl get pods -n etelios-backend-prod -l app=hr-service
```

### 4. Get Pod Name Directly (One-liner)
```bash
# Get first pod name
kubectl get pods -n etelios-backend-prod -l app=hr-service -o jsonpath='{.items[0].metadata.name}'

# Get all pod names
kubectl get pods -n etelios-backend-prod -l app=hr-service -o jsonpath='{.items[*].metadata.name}'
```

### 5. List All Pods in Namespace
```bash
# Production
kubectl get pods -n etelios-backend-prod

# Development
kubectl get pods -n etelios-backend-dev
```

## Using Pod Names

Once you have the pod name, you can:

### Check Pod Logs
```bash
kubectl logs -n etelios-backend-prod <pod-name>
# Example: kubectl logs -n etelios-backend-prod hr-service-7d8f9c4b5-abc12
```

### Describe Pod (Get Details)
```bash
kubectl describe pod -n etelios-backend-prod <pod-name>
# Example: kubectl describe pod -n etelios-backend-prod hr-service-7d8f9c4b5-abc12
```

### Execute Commands in Pod
```bash
kubectl exec -it -n etelios-backend-prod <pod-name> -- /bin/sh
# Example: kubectl exec -it -n etelios-backend-prod hr-service-7d8f9c4b5-abc12 -- /bin/sh
```

### Check Code in Pod
```bash
kubectl exec -n etelios-backend-prod <pod-name> -- cat /app/src/controllers/hrController.js | grep requiredFields
```

### Delete Unhealthy Pod (Auto-restarts)
```bash
kubectl delete pod -n etelios-backend-prod <pod-name>
# Example: kubectl delete pod -n etelios-backend-prod hr-service-7d8f9c4b5-xyz34
```

## Expected Pod Name Format

Pod names typically follow this pattern:
```
<deployment-name>-<replica-set-hash>-<random-string>
```

For hr-service:
```
hr-service-<hash>-<random>
```

Example:
- `hr-service-7d8f9c4b5-abc12`
- `hr-service-7d8f9c4b5-xyz34`

## Quick Reference

| Command | Purpose |
|---------|---------|
| `kubectl get pods -n etelios-backend-prod \| grep hr-service` | List hr-service pods |
| `kubectl logs -n etelios-backend-prod <pod-name>` | View pod logs |
| `kubectl describe pod -n etelios-backend-prod <pod-name>` | Get pod details |
| `kubectl delete pod -n etelios-backend-prod <pod-name>` | Restart pod |
| `kubectl exec -it -n etelios-backend-prod <pod-name> -- /bin/sh` | Access pod shell |

