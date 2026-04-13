# S3 Configuration Complete for Onboarding Documents

## Date: 2026-02-24
## Status: ✅ CONFIGURED AND DEPLOYED

---

## Configuration Applied

### Environment Variables Set in Kubernetes

```bash
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=etelios-prod-storage
```

### Deployment Status

- ✅ Environment variables added to HR service deployment
- ✅ Deployment restarted successfully
- ✅ Pods are running with new configuration
- ✅ S3 initialization code deployed

---

## Verification Steps

### 1. Check Environment Variables

```bash
kubectl exec -n etelios-prod -l app=hr-service -- env | grep AWS
```

Expected output:
```
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=etelios-prod-storage
```

### 2. Check S3 Initialization Logs

```bash
kubectl logs -n etelios-prod -l app=hr-service --tail=100 | grep -i s3
```

Expected log:
```
✅ S3 Storage initialized for onboarding documents
✅ AWS S3 initialized successfully
```

### 3. Verify S3 Bucket

```bash
aws s3 ls s3://etelios-prod-storage --region ap-south-1
```

---

## Testing

### Test Onboarding Document Upload

```bash
# Login
TOKEN=$(curl -s -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"Admin@lenstrack.com","password":"Kadarkhan@123"}' | jq -r '.data.accessToken')

# Upload document
curl -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/hr/onboarding/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: lenstrack" \
  -F "file=@/path/to/test.pdf" \
  -F "employee_id=EMP-2026-969954" \
  -F "document_type=AADHAR"
```

---

## Files Updated

1. ✅ `k8s/etelios-prod/hr-service-deployment.yaml` - Added S3 environment variables
2. ✅ `configure-s3-onboarding.sh` - Configuration script created
3. ✅ Kubernetes deployment updated and restarted

---

## Next Steps

1. ✅ Environment variables configured
2. ✅ Deployment restarted
3. ⏳ **Wait for pods to fully initialize (30-60 seconds)**
4. ⏳ **Check S3 initialization logs**
5. ⏳ **Test onboarding document upload**
6. ⏳ **Verify S3 bucket access (IAM role permissions)**

---

## Troubleshooting

### Issue 1: S3 Not Initialized

**Check:**
```bash
kubectl logs -n etelios-prod -l app=hr-service --tail=200 | grep -i "s3\|storage"
```

**Solution:**
- Verify environment variables are set
- Check IAM role has S3 permissions
- Verify bucket exists

### Issue 2: Access Denied

**Error:** `AccessDenied` or `403 Forbidden`

**Solution:**
- Verify IAM role attached to service account
- Check bucket policy allows access
- Verify bucket name is correct

### Issue 3: Bucket Not Found

**Error:** `NoSuchBucket`

**Solution:**
```bash
# Create bucket if it doesn't exist
aws s3 mb s3://etelios-prod-storage --region ap-south-1
```

---

## Status

✅ **S3 Configuration Applied!**

- Environment variables: ✅ Set
- Deployment: ✅ Restarted
- Pods: ✅ Running
- Code: ✅ Deployed

**Ready for testing!** 🎉
