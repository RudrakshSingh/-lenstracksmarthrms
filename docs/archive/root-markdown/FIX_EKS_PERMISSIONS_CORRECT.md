# Fix EKS Permissions - Correct Policy Names

**Issue:** `AmazonEKSFullAccess` policy not found in your AWS account

---

## 🔍 Available EKS Policies

The policy name might be slightly different. Try searching for:

### Option 1: Search for "EKS" (without "FullAccess")

1. In the search bar, type: **`EKS`**
2. Look for policies like:
   - `AmazonEKSClusterPolicy`
   - `AmazonEKSNodeGroupPolicy`
   - `AmazonEKSWorkerNodePolicy`
   - `AmazonEKS_CNI_Policy`

### Option 2: Use Multiple Policies

Attach these policies one by one:

1. **Search:** `AmazonEKSClusterPolicy`
2. **Search:** `AmazonEKSWorkerNodePolicy`
3. **Search:** `AmazonEKS_CNI_Policy`
4. **Search:** `AmazonEC2FullAccess` (for EC2 resources)
5. **Search:** `AmazonVPCFullAccess` (for VPC resources)

---

## 🔧 Alternative: Create Custom Policy

If policies don't exist, create a custom policy:

### Step 1: Create Custom Policy

1. Go to: https://console.aws.amazon.com/iam/home?region=ap-south-1#/policies
2. Click **"Create policy"**
3. Click **"JSON"** tab
4. Paste this policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "eks:*",
                "ec2:DescribeInstances",
                "ec2:DescribeImages",
                "ec2:DescribeSubnets",
                "ec2:DescribeVpcs",
                "ec2:DescribeSecurityGroups",
                "ec2:DescribeKeyPairs",
                "ec2:DescribeNetworkInterfaces",
                "ec2:CreateNetworkInterface",
                "ec2:DeleteNetworkInterface",
                "ec2:DescribeRouteTables",
                "ec2:DescribeInternetGateways",
                "ec2:DescribeNatGateways",
                "ec2:DescribeAvailabilityZones",
                "ec2:DescribeAccountAttributes",
                "ec2:DescribeNetworkAcls",
                "ec2:DescribeTags",
                "ec2:DescribeVolumes",
                "ec2:DescribeVolumeAttribute",
                "ec2:DescribeVolumeStatus",
                "ec2:DescribeSnapshots",
                "ec2:CreateTags",
                "ec2:DeleteTags",
                "iam:GetRole",
                "iam:ListRoles",
                "iam:PassRole",
                "iam:CreateServiceLinkedRole",
                "iam:AttachRolePolicy",
                "iam:PutRolePolicy",
                "cloudformation:CreateStack",
                "cloudformation:DescribeStacks",
                "cloudformation:DescribeStackEvents",
                "cloudformation:DescribeStackResource",
                "cloudformation:DescribeStackResources",
                "cloudformation:DeleteStack",
                "cloudformation:GetTemplate",
                "cloudformation:ValidateTemplate",
                "logs:CreateLogGroup",
                "logs:DescribeLogGroups",
                "logs:PutRetentionPolicy"
            ],
            "Resource": "*"
        }
    ]
}
```

5. Click **"Next"**
6. Name: `EteliosEKSCustomPolicy`
7. Description: `Custom policy for EKS cluster creation`
8. Click **"Create policy"**

### Step 2: Attach to User

1. Go back to user: `etelios-rudraksh`
2. Click **"Add permissions"**
3. Select **"Attach policies directly"**
4. Search: `EteliosEKSCustomPolicy`
5. Select and add

---

## ⚡ Quick CLI Fix (If you have admin access)

If you have another user with admin access, run:

```bash
# Create custom policy
aws iam create-policy \
  --policy-name EteliosEKSCustomPolicy \
  --policy-document file://eks-policy.json \
  --description "Custom EKS policy for migration"

# Attach to user
aws iam attach-user-policy \
  --user-name etelios-rudraksh \
  --policy-arn arn:aws:iam::383234048604:policy/EteliosEKSCustomPolicy
```

---

## 🎯 Simplest Solution: Use AdministratorAccess

If you have access to attach `AdministratorAccess` policy:

1. Search for: **`AdministratorAccess`**
2. This will give all permissions including EKS
3. Attach this policy temporarily for migration

**Note:** Remove this after migration for security.

---

## 📋 What to Search For

Try these searches in order:

1. **`AdministratorAccess`** (if available)
2. **`EKS`** (to see all EKS-related policies)
3. **`AmazonEC2FullAccess`** (for EC2 resources)
4. **`AmazonVPCFullAccess`** (for VPC resources)
5. **`IAMFullAccess`** (for IAM operations)

---

**After attaching any EKS-related policy, wait 30 seconds and run:**
```bash
./day1-aws-setup.sh
```
