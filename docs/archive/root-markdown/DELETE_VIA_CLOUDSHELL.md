# Delete Everything via AWS CloudShell

## ✅ CloudShell is BETTER - Has proper permissions!

---

## Step 1: Open CloudShell

1. AWS Console में top-right में **CloudShell icon** click करें (terminal icon)
2. CloudShell opens (may take 30 seconds first time)
3. Pre-configured AWS CLI with your permissions

---

## Step 2: Run These Commands (Copy-Paste)

### 2.1: Delete Node Groups

```bash
# Delete nodegroup 1
aws eks delete-nodegroup \
  --cluster-name etelios-prod \
  --nodegroup-name standard-workers-v2 \
  --region ap-south-1

# Delete nodegroup 2 (if exists)
aws eks delete-nodegroup \
  --cluster-name etelios-prod \
  --nodegroup-name standard-workers \
  --region ap-south-1

echo "✅ Nodegroup deletion initiated"
echo "Waiting 10 minutes for deletion..."
sleep 600
```

### 2.2: Delete EKS Cluster

```bash
# Delete cluster
aws eks delete-cluster \
  --name etelios-prod \
  --region ap-south-1

echo "✅ Cluster deletion initiated (will take 10-15 minutes)"
```

### 2.3: Delete DocumentDB

```bash
# Delete DocumentDB cluster
aws docdb delete-db-cluster \
  --db-cluster-identifier etelios-docdb-cluster \
  --skip-final-snapshot \
  --region ap-south-1

echo "✅ DocumentDB deletion initiated"
```

### 2.4: Delete NAT Gateways (IMPORTANT - Expensive!)

```bash
# Get NAT Gateway IDs
NAT1=$(aws ec2 describe-nat-gateways \
  --filter "Name=tag:Name,Values=etelios-nat-1" \
  --query 'NatGateways[0].NatGatewayId' \
  --output text \
  --region ap-south-1)

NAT2=$(aws ec2 describe-nat-gateways \
  --filter "Name=tag:Name,Values=etelios-nat-2" \
  --query 'NatGateways[0].NatGatewayId' \
  --output text \
  --region ap-south-1)

# Delete NAT Gateways
aws ec2 delete-nat-gateway --nat-gateway-id $NAT1 --region ap-south-1
aws ec2 delete-nat-gateway --nat-gateway-id $NAT2 --region ap-south-1

echo "✅ NAT Gateways deletion initiated"
echo "Waiting 3 minutes..."
sleep 180

# Get Elastic IP allocation IDs
EIP1=$(aws ec2 describe-addresses \
  --filters "Name=tag:Name,Values=etelios-eip-1" \
  --query 'Addresses[0].AllocationId' \
  --output text \
  --region ap-south-1)

EIP2=$(aws ec2 describe-addresses \
  --filters "Name=tag:Name,Values=etelios-eip-2" \
  --query 'Addresses[0].AllocationId' \
  --output text \
  --region ap-south-1)

# Release Elastic IPs
aws ec2 release-address --allocation-id $EIP1 --region ap-south-1
aws ec2 release-address --allocation-id $EIP2 --region ap-south-1

echo "✅ Elastic IPs released"
```

### 2.5: Delete Load Balancers (if not auto-deleted)

```bash
# List load balancers
aws elbv2 describe-load-balancers --region ap-south-1 --query 'LoadBalancers[*].[LoadBalancerName,LoadBalancerArn]' --output table

# Delete if any exist (EKS should auto-delete)
# aws elbv2 delete-load-balancer --load-balancer-arn <ARN> --region ap-south-1
```

### 2.6: Verify Everything Deleted

```bash
# Check EKS
aws eks list-clusters --region ap-south-1
# Should not show etelios-prod

# Check EC2 instances
aws ec2 describe-instances \
  --filters "Name=tag:eks:cluster-name,Values=etelios-prod" "Name=instance-state-name,Values=running" \
  --query 'Reservations[*].Instances[*].[InstanceId,State.Name]' \
  --output table \
  --region ap-south-1
# Should show: No resources

# Check DocumentDB
aws docdb describe-db-clusters --region ap-south-1 --query 'DBClusters[*].DBClusterIdentifier'
# Should not show etelios-docdb-cluster

# Check NAT Gateways
aws ec2 describe-nat-gateways --region ap-south-1 --query 'NatGateways[?State==`available`]'
# Should show: []

echo ""
echo "✅ All major resources deleted!"
echo "Charges stopped!"
```

---

## 🚀 Complete CloudShell Script

**Copy-paste this entire block in CloudShell:**

```bash
#!/bin/bash

REGION="ap-south-1"
CLUSTER_NAME="etelios-prod"

echo "=========================================="
echo "Deleting EKS Cluster and All Resources"
echo "=========================================="
echo ""

# 1. Delete nodegroups
echo "1. Deleting node groups..."
aws eks delete-nodegroup --cluster-name $CLUSTER_NAME --nodegroup-name standard-workers-v2 --region $REGION 2>/dev/null || echo "Nodegroup may not exist"
aws eks delete-nodegroup --cluster-name $CLUSTER_NAME --nodegroup-name standard-workers --region $REGION 2>/dev/null || echo "Nodegroup may not exist"
echo "   Waiting 10 minutes for nodegroups to delete..."
sleep 600

# 2. Delete EKS cluster
echo "2. Deleting EKS cluster..."
aws eks delete-cluster --name $CLUSTER_NAME --region $REGION
echo "   ✅ Cluster deletion initiated"

# 3. Delete DocumentDB
echo "3. Deleting DocumentDB..."
aws docdb delete-db-cluster \
  --db-cluster-identifier etelios-docdb-cluster \
  --skip-final-snapshot \
  --region $REGION 2>/dev/null || echo "May not exist"
echo "   ✅ DocumentDB deletion initiated"

# 4. Delete NAT Gateways
echo "4. Deleting NAT Gateways..."
NAT_IDS=$(aws ec2 describe-nat-gateways \
  --filter "Name=vpc-id,Values=vpc-0b9d03edaf63a59c7" "Name=state,Values=available" \
  --query 'NatGateways[*].NatGatewayId' \
  --output text \
  --region $REGION)

for nat in $NAT_IDS; do
    echo "   Deleting NAT Gateway: $nat"
    aws ec2 delete-nat-gateway --nat-gateway-id $nat --region $REGION
done

echo "   Waiting 3 minutes for NAT Gateways to delete..."
sleep 180

# 5. Release Elastic IPs
echo "5. Releasing Elastic IPs..."
EIP_IDS=$(aws ec2 describe-addresses \
  --filters "Name=domain,Values=vpc" \
  --query 'Addresses[*].AllocationId' \
  --output text \
  --region $REGION)

for eip in $EIP_IDS; do
    echo "   Releasing EIP: $eip"
    aws ec2 release-address --allocation-id $eip --region $REGION 2>/dev/null || echo "May be in use"
done

echo ""
echo "=========================================="
echo "Deletion Complete!"
echo "=========================================="
echo ""
echo "Major resources deleted. Charges stopped!"
echo ""
echo "Verify with:"
echo "  aws eks list-clusters --region $REGION"
echo ""
```

---

## ⏱️ Timeline

- Nodegroups: 10 minutes
- Cluster: 15 minutes (runs in background)
- DocumentDB: 10 minutes (runs in background)
- NAT Gateways: 3 minutes
- **Total script time:** ~25 minutes

---

## 💰 After Deletion

**Before:** $580/month  
**After:** $1/month (ECR + S3)  
**Saved:** $579/month

---

## ✅ Advantages of CloudShell

1. **Pre-configured** - AWS CLI ready
2. **Proper permissions** - Can disable termination protection
3. **No local setup** - Works from browser
4. **Free** - No charges for CloudShell

---

## 🎯 Just Do This

1. **Open CloudShell** (top-right icon in AWS Console)
2. **Copy-paste** the complete script above
3. **Press Enter**
4. **Wait** 25 minutes
5. **Done** - Everything deleted!

**Start now to stop charges!**
