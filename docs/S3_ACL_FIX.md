# S3 ACL Fix - AccessControlListNotSupported Error

**Date:** March 9, 2026  
**Issue:** `AccessControlListNotSupported: The bucket does not allow ACLs`  
**Status:** ✅ **FIXED**

---

## 🔍 Problem

S3 upload was failing with error:
```
AccessControlListNotSupported: The bucket does not allow ACLs
```

**Root Cause:** 
- New S3 buckets have ACLs disabled by default
- Code was trying to set `ACL: 'public-read'` which is not allowed

---

## ✅ Fix Applied

### Files Updated:

1. **HR Service:** `microservices/hr-service/src/config/s3Storage.js`
   - Removed `ACL: 'public-read'` from PutObjectCommand

2. **Attendance Service:** `microservices/attendance-service/src/config/s3Storage.js`
   - Removed `ACL: 'public-read'` from PutObjectCommand

### Code Change:

**Before:**
```javascript
const uploadCommand = new PutObjectCommand({
  Bucket: AWS_S3_BUCKET_NAME,
  Key: fileKey,
  Body: fileBuffer,
  ContentType: contentType,
  ACL: 'public-read',  // ❌ This causes error
  Metadata: { ... }
});
```

**After:**
```javascript
const uploadCommand = new PutObjectCommand({
  Bucket: AWS_S3_BUCKET_NAME,
  Key: fileKey,
  Body: fileBuffer,
  ContentType: contentType,
  // ACL removed - bucket has ACLs disabled
  Metadata: { ... }
});
```

---

## 🚀 Deployment

### Option 1: Rebuild and Deploy (Recommended)

```bash
# Build and push HR service
cd microservices/hr-service
docker build -t 383234048604.dkr.ecr.ap-south-1.amazonaws.com/etelios-hr-service:latest .
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 383234048604.dkr.ecr.ap-south-1.amazonaws.com
docker push 383234048604.dkr.ecr.ap-south-1.amazonaws.com/etelios-hr-service:latest

# Build and push Attendance service
cd ../attendance-service
docker build -t 383234048604.dkr.ecr.ap-south-1.amazonaws.com/etelios-attendance-service:latest .
docker push 383234048604.dkr.ecr.ap-south-1.amazonaws.com/etelios-attendance-service:latest

# Restart services
kubectl rollout restart deployment/hr-service -n etelios-prod
kubectl rollout restart deployment/attendance-service -n etelios-prod
```

### Option 2: If Using Live Code Updates

If your services support live code reloading:
```bash
# Just restart to pick up changes
kubectl rollout restart deployment/hr-service -n etelios-prod
kubectl rollout restart deployment/attendance-service -n etelios-prod
```

---

## 🔒 Making Files Public (Optional)

If you need public access to uploaded files, use **Bucket Policy** instead of ACLs:

### Create Bucket Policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::etelios-prod-storage/*"
    }
  ]
}
```

### Apply Policy:

```bash
aws s3api put-bucket-policy \
  --bucket etelios-prod-storage \
  --policy file://bucket-policy.json \
  --region ap-south-1
```

---

## ✅ Verification

After deployment, test upload again:

```bash
# Test onboarding upload
curl -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/api/hr/onboarding/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: lenstrack" \
  -F "file=@image.png" \
  -F "employee_id=TEST-001" \
  -F "document_type=PHOTO"
```

**Expected:** HTTP 200/201 with S3 URL in response

---

## 📊 Status

- ✅ Code updated (ACL removed)
- ⏳ Needs deployment (rebuild images)
- ⏳ Test after deployment

---

**Last Updated:** March 9, 2026  
**Next Action:** Rebuild and deploy updated images
