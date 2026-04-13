# S3 Image Upload Test Results

**Date:** March 9, 2026  
**Status:** ⚠️ **Configuration Complete - Needs Deployment**

---

## 🧪 Test Results

### Test 1: Onboarding Document Upload
- **Endpoint:** `POST /api/hr/onboarding/upload`
- **Status:** ⚠️ Rate Limited (429)
- **Issue:** Too many requests from IP
- **Action:** Wait and retry

### Test 2: Attendance Selfie Upload
- **Endpoint:** `POST /api/attendance/checkin`
- **Status:** ❌ Service Unavailable (503)
- **Issue:** Attendance service may need restart after S3 config
- **Action:** Deploy updated configuration

---

## ✅ Configuration Status

### HR Service
- ✅ S3 config code implemented
- ✅ Environment variables configured
- ✅ Deployment has AWS env vars
- ✅ S3 initialization code present

### Attendance Service
- ✅ S3 config code implemented
- ✅ Environment variables added to deployment YAML
- ⚠️ **Needs deployment** - Config not yet applied

---

## 🚀 Deployment Required

### Step 1: Apply Attendance Service Configuration

```bash
# Apply updated deployment
kubectl apply -f k8s/etelios-prod/attendance-service-deployment.yaml

# Restart service to pick up new env vars
kubectl rollout restart deployment/attendance-service -n etelios-prod

# Wait for rollout
kubectl rollout status deployment/attendance-service -n etelios-prod --timeout=300s
```

### Step 2: Verify Environment Variables

```bash
# Check attendance service has AWS env vars
kubectl exec -n etelios-prod deployment/attendance-service -- env | grep AWS
```

**Expected:**
```
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=etelios-prod-storage
```

### Step 3: Verify S3 Initialization

```bash
# Check logs for S3 initialization
kubectl logs -n etelios-prod -l app=attendance-service --tail=100 | grep -i "s3.*initialized"
```

**Expected:**
```
✅ AWS S3 initialized successfully
```

---

## 🧪 Testing After Deployment

### Test 1: Onboarding Document Upload

```bash
# Get token
TOKEN=$(curl -s -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"Admin@lenstrack.com","password":"Kadarkhan@123"}' | jq -r '.data.accessToken')

# Upload document
curl -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/api/hr/onboarding/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: default" \
  -F "file=@/path/to/image.png" \
  -F "employee_id=EMP-001" \
  -F "document_type=PHOTO"
```

### Test 2: Attendance Selfie Upload (Base64)

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

### Test 3: Attendance Selfie Upload (File)

```bash
# Clock in with selfie file
curl -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/api/attendance/checkin" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: default" \
  -F "selfie=@/path/to/selfie.jpg" \
  -F "latitude=19.0760" \
  -F "longitude=72.8777"
```

---

## ✅ Verification Checklist

- [ ] Attendance service deployment applied
- [ ] Attendance service restarted
- [ ] AWS env vars present in attendance service
- [ ] S3 initialization successful in logs
- [ ] Onboarding document upload works
- [ ] Attendance selfie upload works (base64)
- [ ] Attendance selfie upload works (file)
- [ ] Files appear in S3 bucket
- [ ] S3 URLs returned in API responses

---

## 📊 Expected S3 Structure

After successful uploads:

```
etelios-prod-storage/
├── onboarding/
│   └── {timestamp}-TEST-EMP-001-PHOTO-{filename}
└── attendance/
    └── selfies/
        └── {timestamp}-selfie.jpg
```

---

## 🔍 Troubleshooting

### Issue: S3 Upload Fails

**Check:**
1. Environment variables set correctly
2. IAM role has S3 permissions
3. Bucket exists and is accessible
4. Service logs for errors

**Commands:**
```bash
# Check env vars
kubectl exec -n etelios-prod deployment/attendance-service -- env | grep AWS

# Check logs
kubectl logs -n etelios-prod -l app=attendance-service --tail=100 | grep -i "s3\|error"

# Check bucket
aws s3 ls s3://etelios-prod-storage/ --region ap-south-1
```

### Issue: 503 Service Unavailable

**Solution:**
1. Restart attendance service
2. Check pod status
3. Verify deployment applied

**Commands:**
```bash
kubectl get pods -n etelios-prod -l app=attendance-service
kubectl rollout restart deployment/attendance-service -n etelios-prod
```

---

**Last Updated:** March 9, 2026  
**Next Action:** Deploy attendance-service configuration
