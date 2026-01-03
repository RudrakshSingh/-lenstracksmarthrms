# Check Production Image Status

**Date**: 2026-01-02  
**Task**: Verify if production is using the updated image

---

## 🔍 How to Check Production Image

### Method 1: Using kubectl (Recommended)

```bash
# 1. Check HR Service deployment image
kubectl get deployment hr-service -n etelios-backend-prod \
  -o jsonpath='{.spec.template.spec.containers[0].image}'

# 2. Check running pods image
kubectl get pods -n etelios-backend-prod -l app=hr-service \
  -o jsonpath='{.items[0].spec.containers[0].image}'

# 3. Check pod status
kubectl get pods -n etelios-backend-prod | grep hr-service

# 4. Check pod image pull policy
kubectl describe pod <pod-name> -n etelios-backend-prod | grep Image
```

### Method 2: Check Azure DevOps Pipeline

1. Go to Azure DevOps portal
2. Navigate to Pipelines → Recent runs
3. Check if latest build completed successfully
4. Verify deployment to production namespace

### Method 3: Check Image Tag/Commit

```bash
# Check current commit
git log -1 --oneline

# Check if image tag matches commit
# Image should be tagged with: latest or commit hash
```

---

## 📋 Expected Image Format

### Current Image Should Be:
```
eteliosacr-hvawabdbgge7e0fu.azurecr.io/hr-service:latest
```

### Or with specific tag:
```
eteliosacr-hvawabdbgge7e0fu.azurecr.io/hr-service:<commit-hash>
```

---

## 🔍 Verification Steps

### Step 1: Check Pipeline Status
- [ ] Azure pipeline build completed
- [ ] Docker image built successfully
- [ ] Image pushed to ACR
- [ ] Deployment to AKS completed

### Step 2: Check Deployment
- [ ] Deployment updated with new image
- [ ] Pods restarted with new image
- [ ] Pods are in Running state

### Step 3: Verify Code Changes
- [ ] Check pod logs for recent changes
- [ ] Test registration endpoint
- [ ] Verify fix is working

---

## 🧪 Quick Test

### Test Registration Endpoint:
```bash
curl -k -X POST "https://98.70.245.87/api/auth/register" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "EMP-2025-TEST",
    "name": "Test User",
    "email": "test@example.com",
    "phone": "9876543210",
    "password": "Test@123456",
    "role": "employee",
    "address": {
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India"
    }
  }'
```

### Expected Response (After Fix):
```json
{
  "success": true,
  "message": "Basic information registered successfully",
  "data": {
    "employee_id": "EMP-2025-TEST",
    "user_id": "...",
    "email": "test@example.com",
    "status": "pending"
  }
}
```

---

## ⚠️ Common Issues

### Issue 1: Image Not Updated
**Symptom**: Pods still using old image
**Solution**: 
- Check if pipeline completed
- Manually restart deployment: `kubectl rollout restart deployment/hr-service -n etelios-backend-prod`

### Issue 2: ImagePullBackOff
**Symptom**: Pods can't pull image
**Solution**:
- Check ACR authentication
- Verify image exists in ACR
- Check ACR URL is correct

### Issue 3: Old Code Running
**Symptom**: Fix not working in production
**Solution**:
- Verify deployment updated
- Check pod restart time
- Force pod restart if needed

---

## 📝 Notes

- **Image Tag**: If using `latest` tag, ensure deployment is restarted
- **Build Time**: Pipeline may take 5-10 minutes to complete
- **Deployment Time**: Pod restart may take 1-2 minutes
- **Cache**: Browser/API cache might show old responses

---

**Status**: ⏳ **Waiting for Pipeline Completion**

