# AWS S3 Environment Configuration for Onboarding Documents

## Environment Variables

```bash
# AWS S3 Configuration
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=etelios-prod-storage

# Optional: Use IAM role in production (recommended)
# AWS_ACCESS_KEY_ID=          # Leave empty for IAM role
# AWS_SECRET_ACCESS_KEY=      # Leave empty for IAM role

# Optional: For S3-compatible services (MinIO, etc.)
# AWS_S3_ENDPOINT=
```

---

## Configuration Methods

### Method 1: Environment Variables (Recommended for Production)

**Kubernetes Deployment:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hr-service
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

**Docker Compose:**

```yaml
services:
  hr-service:
    environment:
      - AWS_REGION=ap-south-1
      - AWS_S3_BUCKET_NAME=etelios-prod-storage
      # IAM role or access keys
```

### Method 2: .env File (Development)

Create `.env` file in `microservices/hr-service/`:

```bash
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=etelios-prod-storage
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

### Method 3: Kubernetes ConfigMap + Secret

**ConfigMap:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hr-service-config
data:
  AWS_REGION: "ap-south-1"
  AWS_S3_BUCKET_NAME: "etelios-prod-storage"
```

**Secret (if using access keys):**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: hr-service-aws-secret
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: "your-access-key-id"
  AWS_SECRET_ACCESS_KEY: "your-secret-access-key"
```

**Deployment:**

```yaml
spec:
  template:
    spec:
      containers:
      - name: hr-service
        envFrom:
        - configMapRef:
            name: hr-service-config
        - secretRef:
            name: hr-service-aws-secret
```

---

## IAM Role Setup (Production - Recommended)

### 1. Create IAM Role for EKS Pods

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

### 2. Attach IAM Role to EKS Service Account

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: hr-service-sa
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/hr-service-s3-role
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hr-service
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

### 1. Create S3 Bucket

```bash
aws s3 mb s3://etelios-prod-storage --region ap-south-1
```

### 2. Configure Bucket Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowHRServiceUpload",
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
    },
    {
      "Sid": "AllowHRServiceList",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_ID:role/hr-service-s3-role"
      },
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::etelios-prod-storage"
    }
  ]
}
```

### 3. Enable CORS (if needed for frontend access)

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

---

## Verification

### Check Environment Variables

```bash
# In HR service pod
kubectl exec -it <hr-service-pod> -n <namespace> -- env | grep AWS
```

Expected output:
```
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=etelios-prod-storage
```

### Test S3 Connection

```bash
# In HR service pod
kubectl exec -it <hr-service-pod> -n <namespace> -- node -e "
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
const client = new S3Client({ region: process.env.AWS_REGION });
client.send(new ListBucketsCommand({})).then(console.log).catch(console.error);
"
```

---

## Troubleshooting

### Issue 1: S3 Not Initialized

**Error:** `AWS S3 Storage not initialized`

**Solution:**
1. Check environment variables are set
2. Verify IAM role permissions
3. Check bucket exists

### Issue 2: Access Denied

**Error:** `AccessDenied` or `403 Forbidden`

**Solution:**
1. Verify IAM role has S3 permissions
2. Check bucket policy
3. Verify bucket name is correct

### Issue 3: Bucket Not Found

**Error:** `NoSuchBucket` or `404 Not Found`

**Solution:**
1. Create bucket: `aws s3 mb s3://etelios-prod-storage --region ap-south-1`
2. Verify bucket name in environment variable
3. Check region matches

---

## Current Configuration Status

✅ **Environment Variables:**
- `AWS_REGION=ap-south-1`
- `AWS_S3_BUCKET_NAME=etelios-prod-storage`
- `AWS_ACCESS_KEY_ID` - Optional (use IAM role)
- `AWS_SECRET_ACCESS_KEY` - Optional (use IAM role)

✅ **Code Implementation:**
- S3 storage config: `microservices/hr-service/src/config/s3Storage.js`
- Upload middleware: `microservices/hr-service/src/middleware/s3Upload.middleware.js`
- Server initialization: `microservices/hr-service/src/server.js`

✅ **Ready for:**
- Production deployment with IAM role
- Development with access keys
- Testing with test script

---

## Next Steps

1. ✅ Environment variables configured
2. ✅ Code implementation complete
3. ⏳ **Deploy to production**
4. ⏳ **Test with real documents**
5. ⏳ **Monitor S3 usage and costs**

---

**Status: Configuration Complete!** 🎉
