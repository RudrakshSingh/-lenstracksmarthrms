# S3 Image Storage Configuration Guide

**Date:** March 9, 2026  
**Status:** ✅ **CONFIGURED**

---

## 📋 Overview

This guide covers S3 configuration for:
1. **Onboarding Documents** - Employee onboarding documents (Aadhar, PAN, Photo, Signature, etc.)
2. **Attendance Selfies** - Selfie images captured during check-in/check-out

---

## 🗂️ S3 Bucket Structure

**Bucket Name:** `etelios-prod-storage`  
**Region:** `ap-south-1`

### Folder Structure:
```
etelios-prod-storage/
├── onboarding/
│   ├── {timestamp}-{employeeId}-{documentType}-{filename}
│   └── ...
└── attendance/
    └── selfies/
        ├── {timestamp}-{filename}
        └── ...
```

---

## 🔧 Configuration

### 1. S3 Bucket Setup

**Bucket already exists:** ✅ `etelios-prod-storage`

**Verify bucket:**
```bash
aws s3 ls s3://etelios-prod-storage --region ap-south-1
```

---

### 2. IAM Role/Policy for S3 Access

**For EKS Pods (Recommended):**

Create IAM policy for S3 access:

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

**Attach to EKS Node Group IAM Role:**
```bash
# Get node group role
aws eks describe-nodegroup \
  --cluster-name etelios-prod \
  --nodegroup-name <node-group-name> \
  --query 'nodegroup.nodeRole' \
  --output text

# Attach policy
aws iam attach-role-policy \
  --role-name <node-group-role> \
  --policy-arn arn:aws:iam::383234048604:policy/EteliosS3AccessPolicy
```

---

### 3. Environment Variables

#### HR Service (Onboarding Documents)

**File:** `k8s/etelios-prod/hr-service-deployment.yaml`

```yaml
env:
  - name: AWS_REGION
    value: "ap-south-1"
  - name: AWS_S3_BUCKET_NAME
    value: "etelios-prod-storage"
```

**Status:** ✅ Already configured

#### Attendance Service (Selfies)

**File:** `k8s/etelios-prod/attendance-service-deployment.yaml`

```yaml
env:
  - name: AWS_REGION
    value: "ap-south-1"
  - name: AWS_S3_BUCKET_NAME
    value: "etelios-prod-storage"
```

**Status:** ✅ Configured (needs deployment)

---

## 📝 Code Implementation

### 1. Onboarding Documents Upload

**Route:** `POST /api/hr/onboarding/upload`

**File:** `microservices/hr-service/src/routes/onboarding.routes.js`

```javascript
router.post(
  '/onboarding/upload',
  authenticate,
  validateTenantMiddleware(),
  extractTenantId,
  requireRole(['hr', 'admin', 'superadmin']),
  uploadSingle('file'),
  require('../middleware/s3Upload.middleware').uploadToS3Storage, // S3 upload
  asyncHandler(onboardingController.uploadOnboardingDocument)
);
```

**S3 Storage Config:** `microservices/hr-service/src/config/s3Storage.js`
- Folder: `onboarding/`
- File naming: `{timestamp}-{employeeId}-{documentType}-{filename}`

**Supported Document Types:**
- AADHAR
- PAN
- PASSPORT
- DRIVING_LICENSE
- EDUCATION_CERTIFICATE
- EXPERIENCE_CERTIFICATE
- BANK_STATEMENT
- PHOTO
- SIGNATURE
- OTHER

---

### 2. Attendance Selfie Upload

**Route:** `POST /api/attendance/checkin` or `POST /api/attendance/check-out`

**File:** `microservices/attendance-service/src/routes/attendance.routes.js`

```javascript
router.post('/check-in',
  authenticate,
  checkEmployeeStatus(['active']),
  upload.single('selfie'), // Selfie upload is optional
  uploadToBlobStorage, // Upload selfie to AWS S3
  validateRequest(clockInSchema),
  clockIn
);
```

**S3 Storage Config:** `microservices/attendance-service/src/config/s3Storage.js`
- Folder: `attendance/selfies/`
- File naming: `{timestamp}-{filename}`

**Upload Methods:**
1. **File Upload:** Via `multipart/form-data` with field name `selfie`
2. **Base64:** Via request body `{ "selfie": "data:image/jpeg;base64,..." }`

---

## 🚀 Deployment Steps

### Step 1: Update Attendance Service Deployment

```bash
# Apply updated deployment with S3 env vars
kubectl apply -f k8s/etelios-prod/attendance-service-deployment.yaml

# Restart pods to pick up new env vars
kubectl rollout restart deployment/attendance-service -n etelios-prod

# Wait for rollout
kubectl rollout status deployment/attendance-service -n etelios-prod
```

### Step 2: Verify Environment Variables

```bash
# Check HR Service
kubectl exec -n etelios-prod deployment/hr-service -- env | grep AWS

# Check Attendance Service
kubectl exec -n etelios-prod deployment/attendance-service -- env | grep AWS
```

**Expected Output:**
```
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=etelios-prod-storage
```

### Step 3: Verify S3 Initialization

```bash
# Check HR Service logs
kubectl logs -n etelios-prod -l app=hr-service --tail=50 | grep -i "s3\|storage"

# Check Attendance Service logs
kubectl logs -n etelios-prod -l app=attendance-service --tail=50 | grep -i "s3\|storage"
```

**Expected Output:**
```
✅ AWS S3 initialized successfully
✅ S3 Storage initialized for onboarding documents
```

---

## 🧪 Testing

### Test 1: Onboarding Document Upload

```bash
# Get auth token
TOKEN=$(curl -s -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' | jq -r '.data.accessToken')

# Upload document
curl -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/api/hr/onboarding/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: default" \
  -F "file=@/path/to/document.pdf" \
  -F "employee_id=EMP-001" \
  -F "document_type=PHOTO"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "document": {
      "type": "PHOTO",
      "url": "https://etelios-prod-storage.s3.ap-south-1.amazonaws.com/onboarding/1234567890-EMP-001-PHOTO-document.pdf",
      "uploaded_at": "2026-03-09T..."
    }
  }
}
```

### Test 2: Attendance Selfie Upload (File)

```bash
# Clock in with selfie file
curl -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/api/attendance/checkin" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: default" \
  -F "selfie=@/path/to/selfie.jpg" \
  -F "latitude=19.0760" \
  -F "longitude=72.8777"
```

### Test 3: Attendance Selfie Upload (Base64)

```bash
# Clock in with base64 selfie
curl -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/api/attendance/checkin" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: default" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 19.0760,
    "longitude": 72.8777,
    "selfie": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "attendance": {
      "check_in_time": "2026-03-09T...",
      "check_in_selfie": {
        "url": "https://etelios-prod-storage.s3.ap-south-1.amazonaws.com/attendance/selfies/1234567890-selfie.jpg",
        "secure_url": "https://etelios-prod-storage.s3.ap-south-1.amazonaws.com/attendance/selfies/1234567890-selfie.jpg"
      }
    }
  }
}
```

---

## 🔒 Security & Permissions

### S3 Bucket Policy (Optional - for public access)

If you want public read access to images:

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

**Apply:**
```bash
aws s3api put-bucket-policy \
  --bucket etelios-prod-storage \
  --policy file://bucket-policy.json
```

### Private Access (Recommended)

For private access, remove `ACL: 'public-read'` from upload code and use signed URLs:

```javascript
// Generate signed URL (valid for 1 hour)
const getSignedUrl = async (fileKey) => {
  const command = new GetObjectCommand({
    Bucket: AWS_S3_BUCKET_NAME,
    Key: fileKey
  });
  
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
};
```

---

## 📊 Monitoring

### Check S3 Usage

```bash
# List onboarding documents
aws s3 ls s3://etelios-prod-storage/onboarding/ --recursive

# List attendance selfies
aws s3 ls s3://etelios-prod-storage/attendance/selfies/ --recursive

# Get bucket size
aws s3 ls s3://etelios-prod-storage --recursive --human-readable --summarize
```

### CloudWatch Metrics

Monitor S3 usage in AWS Console:
- **Metrics:** BucketSizeBytes, NumberOfObjects
- **Alarms:** Set up alerts for storage growth

---

## ✅ Verification Checklist

- [x] S3 bucket exists: `etelios-prod-storage`
- [x] HR Service has AWS env vars configured
- [x] Attendance Service has AWS env vars configured
- [x] S3 code implemented in both services
- [x] Middleware configured for uploads
- [ ] IAM role/policy attached to EKS nodes
- [ ] Test onboarding document upload
- [ ] Test attendance selfie upload (file)
- [ ] Test attendance selfie upload (base64)
- [ ] Verify files in S3 bucket
- [ ] Check logs for S3 initialization

---

## 🐛 Troubleshooting

### Issue: S3 Upload Fails

**Check:**
1. Environment variables set correctly
2. IAM role has S3 permissions
3. Bucket exists and is accessible
4. Check service logs for errors

**Logs:**
```bash
kubectl logs -n etelios-prod -l app=hr-service --tail=100 | grep -i "s3\|error"
kubectl logs -n etelios-prod -l app=attendance-service --tail=100 | grep -i "s3\|error"
```

### Issue: Files Not Appearing in S3

**Check:**
1. Verify upload succeeded (check logs)
2. Check S3 bucket permissions
3. Verify file key/path is correct
4. Check if files are in correct folder

---

## 📚 Related Files

- **HR Service S3 Config:** `microservices/hr-service/src/config/s3Storage.js`
- **HR Service Upload Middleware:** `microservices/hr-service/src/middleware/s3Upload.middleware.js`
- **Attendance Service S3 Config:** `microservices/attendance-service/src/config/s3Storage.js`
- **Attendance Service Upload Middleware:** `microservices/attendance-service/src/middleware/blobUpload.middleware.js`
- **Onboarding Controller:** `microservices/hr-service/src/controllers/onboardingController.js`
- **Attendance Controller:** `microservices/attendance-service/src/controllers/attendanceController.js`

---

**Last Updated:** March 9, 2026  
**Status:** ✅ **CONFIGURED AND READY FOR DEPLOYMENT**
