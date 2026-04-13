#!/bin/bash

set -e

CLUSTER_NAME="etelios-prod"
NODEGROUP_NAME="standard-workers"
REGION="ap-south-1"

echo "=========================================="
echo "Fixing and Retrying Node Group Creation"
echo "=========================================="
echo ""

# Step 1: Check VPC CNI addon
echo "🔍 Step 1: Checking VPC CNI addon..."
if kubectl get daemonset -n kube-system aws-node &>/dev/null; then
    echo "✅ VPC CNI addon is installed"
else
    echo "❌ VPC CNI addon is missing - installing..."
    eksctl create addon \
      --name vpc-cni \
      --version latest \
      --cluster $CLUSTER_NAME \
      --region $REGION \
      --force || echo "⚠️  Addon installation failed, continuing..."
fi
echo ""

# Step 2: Clean up failed stack
echo "🔍 Step 2: Cleaning up failed nodegroup..."
if eksctl get nodegroup --cluster=$CLUSTER_NAME --name=$NODEGROUP_NAME --region=$REGION &>/dev/null; then
    echo "⚠️  Node group exists, deleting..."
    eksctl delete nodegroup \
      --cluster=$CLUSTER_NAME \
      --name=$NODEGROUP_NAME \
      --region=$REGION \
      --wait || echo "⚠️  Delete failed, may need manual cleanup"
else
    echo "✅ No existing nodegroup to clean up"
fi
echo ""

# Step 3: Wait a bit for cleanup
echo "⏳ Waiting 30 seconds for cleanup to complete..."
sleep 30
echo ""

# Step 4: Fix subnet settings
echo "🔍 Step 3: Fixing subnet settings (MapPublicIpOnLaunch)..."
eksctl utils update-legacy-subnet-settings --cluster $CLUSTER_NAME --region $REGION || echo "⚠️  Subnet update failed, continuing..."
echo ""

# Step 5: Retry with public subnets (more reliable)
echo "🔍 Step 4: Retrying with public subnets (more reliable)..."
echo ""

# Load resources
LATEST_DAY1=$(ls -t aws-resources-*.txt 2>/dev/null | grep -v "day2\|day3" | head -n 1)
if [ -f "$LATEST_DAY1" ]; then
    source "$LATEST_DAY1"
fi

PUBLIC_SUBNET_1=${PUBLIC_SUBNET_1:-$(grep -m 1 '^PUBLIC_SUBNET_1=' "$LATEST_DAY1" 2>/dev/null | cut -d'=' -f2 || echo "")}
PUBLIC_SUBNET_2=${PUBLIC_SUBNET_2:-$(grep -m 1 '^PUBLIC_SUBNET_2=' "$LATEST_DAY1" 2>/dev/null | cut -d'=' -f2 || echo "")}

if [ -z "$PUBLIC_SUBNET_1" ] || [ -z "$PUBLIC_SUBNET_2" ]; then
    echo "❌ Public subnets not found in resource file"
    echo "   Please run: ./check-nodegroup-error.sh to diagnose"
    exit 1
fi

echo "📋 Using public subnets: $PUBLIC_SUBNET_1, $PUBLIC_SUBNET_2"
echo ""

# Create nodegroup with public subnets
eksctl create nodegroup \
  --cluster=$CLUSTER_NAME \
  --name=$NODEGROUP_NAME \
  --region=$REGION \
  --node-type=t3.medium \
  --nodes=5 \
  --nodes-min=3 \
  --nodes-max=10 \
  --managed \
  --subnet-ids=$PUBLIC_SUBNET_1,$PUBLIC_SUBNET_2

echo ""
echo "✅ Node group creation initiated!"
echo ""
echo "📊 Check status:"
echo "  kubectl get nodes"
echo "  eksctl get nodegroup --cluster=$CLUSTER_NAME --region=$REGION"
