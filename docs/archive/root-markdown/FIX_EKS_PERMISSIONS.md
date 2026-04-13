# Fix EKS Permissions - Quick Guide

**Issue:** IAM user `etelios-rudraksh` doesn't have EKS permissions  
**Error:** `AccessDeniedException: User is not authorized to perform: eks:DescribeClusterVersions`

---

## 🔧 Quick Fix - Add EKS Permissions

### Option 1: Using AWS Console (Recommended - 2 minutes)

1. **Go to IAM Console:**
   - https://console.aws.amazon.com/iam/home?region=ap-south-1#/users

2. **Click on user:** `etelios-rudraksh`

3. **Go to "Permissions" tab**

4. **Click "Add permissions" → "Attach policies directly"**

5. **Search and select:**
   - ✅ `AmazonEKSFullAccess` (or `AmazonEKSClusterPolicy`)

6. **Click "Next" → "Add permissions"**

7. **Done!** ✅

---

### Option 2: Using AWS CLI (1 minute)

Run this command:

```bash
aws iam attach-user-policy \
  --user-name etelios-rudraksh \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSFullAccess
```

**Verify:**
```bash
aws iam list-attached-user-policies --user-name etelios-rudraksh
```

---

## ✅ After Adding Permissions

1. **Wait 30 seconds** for permissions to propagate

2. **Continue with EKS cluster creation:**
   ```bash
   ./day1-aws-setup.sh
   ```

   The script will detect existing resources and continue from EKS cluster creation.

---

## 📋 Required EKS Permissions

The user needs these permissions:
- `eks:CreateCluster`
- `eks:DescribeCluster`
- `eks:DescribeClusterVersions`
- `eks:ListClusters`
- `eks:UpdateClusterConfig`
- `eks:DeleteCluster`
- `eks:CreateNodegroup`
- `eks:DescribeNodegroup`
- `eks:ListNodegroups`
- `eks:UpdateNodegroupConfig`
- `eks:DeleteNodegroup`

**Easiest:** Attach `AmazonEKSFullAccess` policy (includes all above)

---

## 🚀 Quick Command

```bash
# Add EKS permissions
aws iam attach-user-policy \
  --user-name etelios-rudraksh \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSFullAccess

# Wait 30 seconds, then continue
sleep 30

# Run script again
./day1-aws-setup.sh
```

---

**After adding permissions, the script will continue successfully!** ✅
