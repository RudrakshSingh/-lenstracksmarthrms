#!/bin/bash

set -e

CLUSTER_NAME="etelios-prod"
NODEGROUP_NAME="standard-workers-v2"
REGION="ap-south-1"

echo "=========================================="
echo "Create Node Group (Different Name)"
echo "=========================================="
echo ""

echo "💡 Solution: Create nodegroup with different name"
echo "   This avoids the stuck CloudFormation stack"
echo ""

# Load resources
LATEST_DAY1=$(ls -t aws-resources-*.txt 2>/dev/null | grep -v "day2\|day3" | head -n 1)
if [ -f "$LATEST_DAY1" ]; then
    source "$LATEST_DAY1"
fi

PUBLIC_SUBNET_1=${PUBLIC_SUBNET_1:-$(grep -m 1 '^PUBLIC_SUBNET_1=' "$LATEST_DAY1" 2>/dev/null | cut -d'=' -f2 || echo "")}
PUBLIC_SUBNET_2=${PUBLIC_SUBNET_2:-$(grep -m 1 '^PUBLIC_SUBNET_2=' "$LATEST_DAY1" 2>/dev/null | cut -d'=' -f2 || echo "")}

if [ -z "$PUBLIC_SUBNET_1" ] || [ -z "$PUBLIC_SUBNET_2" ]; then
    echo "❌ Public subnets not found"
    exit 1
fi

echo "📋 Configuration:"
echo "  Cluster: $CLUSTER_NAME"
echo "  Node Group: $NODEGROUP_NAME (NEW NAME)"
echo "  Region: $REGION"
echo "  Subnets: $PUBLIC_SUBNET_1, $PUBLIC_SUBNET_2"
echo ""

# Check if new nodegroup already exists
if eksctl get nodegroup --cluster=$CLUSTER_NAME --name=$NODEGROUP_NAME --region=$REGION &>/dev/null; then
    echo "⚠️  Nodegroup $NODEGROUP_NAME already exists"
    eksctl get nodegroup --cluster=$CLUSTER_NAME --name=$NODEGROUP_NAME --region=$REGION
    exit 0
fi

# Ensure VPC CNI
echo "🔍 Checking VPC CNI addon..."
if ! kubectl get daemonset -n kube-system aws-node &>/dev/null; then
    echo "📦 Installing VPC CNI addon..."
    eksctl create addon \
      --name vpc-cni \
      --version latest \
      --cluster $CLUSTER_NAME \
      --region $REGION \
      --force || echo "⚠️  Addon installation failed, continuing..."
else
    echo "✅ VPC CNI addon is installed"
fi
echo ""

# Fix subnet settings
echo "🔍 Ensuring subnet settings..."
eksctl utils update-legacy-subnet-settings \
  --cluster $CLUSTER_NAME \
  --region $REGION || echo "⚠️  Subnet update failed, continuing..."
echo ""

# Create nodegroup with NEW name
echo "🚀 Creating nodegroup '$NODEGROUP_NAME'..."
echo "   This will take 5-10 minutes..."
echo ""

eksctl create nodegroup \
  --cluster=$CLUSTER_NAME \
  --name=$NODEGROUP_NAME \
  --region=$REGION \
  --node-type=t3.medium \
  --nodes=5 \
  --nodes-min=3 \
  --nodes-max=10 \
  --managed \
  --subnet-ids=$PUBLIC_SUBNET_1,$PUBLIC_SUBNET_2 \
  --timeout=30m

echo ""
echo "✅ Nodegroup creation complete!"
echo ""

# Wait for nodes
echo "⏳ Waiting for nodes to be ready..."
kubectl wait --for=condition=Ready nodes --all --timeout=600s || echo "⚠️  Some nodes may still be starting"

echo ""
echo "📊 Final Status:"
kubectl get nodes
echo ""
echo "Pending pods: $(kubectl get pods -n etelios-prod --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l | tr -d ' ')"
echo "Running pods: $(kubectl get pods -n etelios-prod --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')"

echo ""
echo "✅ Nodegroup setup complete!"
echo ""
echo "💡 Note: Old nodegroup 'standard-workers' can be cleaned up later via AWS Console"
