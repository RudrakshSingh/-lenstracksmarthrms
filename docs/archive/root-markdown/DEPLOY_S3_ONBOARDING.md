# Deploy S3 Configuration for Onboarding Documents

## Current Status

✅ **Code Implementation:** Complete
- S3 storage config created
- Upload middleware implemented
- Routes configured
- Server initialization added

❌ **Production Configuration:** Pending
- Environment variables need to be set in Kubernetes
- S3 bucket needs to be configured
- IAM role needs to be attached

---

## Quick Deployment Steps

### 1. Set Environment Variables in Kubernetes

```bash
# Update HR service deployment
kubectl set env deployment/hr-service \
  -n etelios-prod \
  AWS_REGION=ap-south-1 \
  AWS_S3_BUCKET_NAME=etelios-prod-storage
```

### 2. Verify Environment Variables

```bash
# Check if variables are set
kubectl get deployment/hr-service -n etelios-prod -o jsonpath='{.spec.template.spec.containers[0].env[*]}' | jq

# Or check in running pod
kubectl exec -it <hr-service-pod> -n etelios-prod -- env | grep AWS
```

### 3. Restart HR Service

```bash
# Restart to load new environment variables
kubectl rollout restart deployment/hr-service -n etelios-prod

# Wait for rollout
kubectl rollout status deployment/hr-service -n etelios-prod
```

### 4. Check Logs

```bash
# Check if S3 initialized successfully
kubectl logs -n etelios-prod -l app=hr-service --tail=50 | grep -i s3
```

Expected log:
```
✅ S3 Storage initialized for onboarding documents
✅ AWS S3 initialized successfully
```

---

## Full Kubernetes Deployment Configuration

### Option 1: Update Existing Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hr-service
  namespace: etelios-prod
spec:
  template:
    spec:
      containers:
      - name: hr-service
        env:
        - name: AWS_REGION
          value: "ap-south-1"
        - name: AWS_S3_BUCKET_NAME
          value: "etelios-prod-storage"
        # IAM role will be used automatically in EKS
```

### Option 2: Use ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hr-service-s3-config
  namespace: etelios-prod
data:
  AWS_REGION: "ap-south-1"
  AWS_S3_BUCKET_NAME: "etelios-prod-storage"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hr-service
  namespace: etelios-prod
spec:
  template:
    spec:
      containers:
      - name: hr-service
        envFrom:
        - configMapRef:
            name: hr-service-s3-config
```

---

## IAM Role Setup (Required for S3 Access)

### 1. Create IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::etelios-prod-storage",
        "arn:aws:s3:::etelios-prod-storage/*"
      ]
    }
  ]
}
```

### 2. Attach to EKS Service Account

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: hr-service-sa
  namespace: etelios-prod
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/hr-service-s3-role
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hr-service
  namespace: etelios-prod
spec:
  template:
    spec:
      serviceAccountName: hr-service-sa
      containers:
      - name: hr-service
        env:
        - name: AWS_REGION
          value: "ap-south-1"
        - name: AWS_S3_BUCKET_NAME
          value: "etelios-prod-storage"
```

---

## S3 Bucket Setup

### 1. Create Bucket (if not exists)

```bash
aws s3 mb s3://etelios-prod-storage --region ap-south-1
```

### 2. Verify Bucket

```bash
aws s3 ls s3://etelios-prod-storage
```

### 3. Set Bucket Policy (if needed)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowHRServiceAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_ID:role/hr-service-s3-role"
      },
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::etelios-prod-storage/*"
    }
  ]
}
```

---

## Testing After Deployment

### 1. Run Test Script

```bash
./test-onboarding-s3-upload.sh
```

### 2. Manual Test

```bash
# Login
TOKEN=$(curl -s -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"Admin@lenstrack.com","password":"Kadarkhan@123"}' | jq -r '.data.accessToken')

# Upload test document
curl -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/hr/onboarding/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: lenstrack" \
  -F "file=@/path/to/test.pdf" \
  -F "employee_id=EMP-2026-969954" \
  -F "document_type=AADHAR"
```

---

## Troubleshooting

### Issue 1: S3 Not Initialized

**Error:** `STORAGE_UPLOAD_FAILED` or `AWS S3 Storage not initialized`

**Check:**
1. Environment variables set: `kubectl get deployment/hr-service -n etelios-prod -o yaml | grep AWS`
2. Pod logs: `kubectl logs -n etelios-prod -l app=hr-service | grep -i s3`
3. IAM role attached: `kubectl get serviceaccount/hr-service-sa -n etelios-prod -o yaml`

### Issue 2: Access Denied

**Error:** `AccessDenied` or `403 Forbidden`

**Solution:**
1. Verify IAM role has S3 permissions
2. Check bucket policy
3. Verify bucket name matches environment variable

### Issue 3: Bucket Not Found

**Error:** `NoSuchBucket` or `404 Not Found`

**Solution:**
1. Create bucket: `aws s3 mb s3://etelios-prod-storage --region ap-south-1`
2. Verify bucket exists: `aws s3 ls s3://etelios-prod-storage`

---

## Environment Variables Summary

```bash
# Required
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=etelios-prod-storage

# Optional (use IAM role in production)
AWS_ACCESS_KEY_ID=          # Leave empty
AWS_SECRET_ACCESS_KEY=      # Leave empty
```

---

## Files Created

1. ✅ `microservices/hr-service/src/config/s3Storage.js` - S3 configuration
2. ✅ `microservices/hr-service/src/middleware/s3Upload.middleware.js` - Upload middleware
3. ✅ `microservices/hr-service/src/controllers/onboardingController.js` - Updated controller
4. ✅ `microservices/hr-service/src/routes/onboarding.routes.js` - Updated routes
5. ✅ `microservices/hr-service/src/server.js` - S3 initialization
6. ✅ `test-onboarding-s3-upload.sh` - Test script
7. ✅ `ONBOARDING_S3_SETUP.md` - Setup documentation
8. ✅ `S3_ENV_CONFIG.md` - Environment configuration guide
9. ✅ `DEPLOY_S3_ONBOARDING.md` - Deployment guide

---

## Next Steps

1. ✅ Code implementation complete
2. ⏳ **Set environment variables in Kubernetes**
3. ⏳ **Configure IAM role for S3 access**
4. ⏳ **Create/verify S3 bucket**
5. ⏳ **Deploy and test**

---

**Status: Ready for Deployment!** 🚀
