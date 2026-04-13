#!/bin/bash

set -e

CLUSTER_NAME="etelios-prod"
NODEGROUP_NAME="standard-workers"
REGION="ap-south-1"
NODE_TYPE="t3.medium"
NODES=10
NODES_MIN=5
NODES_MAX=15

# Load resources from latest Day 1 file
LATEST_DAY1=$(ls -t aws-resources-*.txt 2>/dev/null | grep -v "day2\|day3" | head -n 1)

if [ -f "$LATEST_DAY1" ]; then
    echo "📋 Loading resources from: $LATEST_DAY1"
    source "$LATEST_DAY1"
else
    echo "⚠️  No Day 1 resource file found. Using defaults."
    echo "   Please ensure VPC and subnets exist."
fi

# Extract critical variables if not set
VPC_ID=${VPC_ID:-$(grep -m 1 '^VPC_ID=' "$LATEST_DAY1" 2>/dev/null | cut -d'=' -f2 || echo "")}
PRIVATE_SUBNET_1=${PRIVATE_SUBNET_1:-$(grep -m 1 '^PRIVATE_SUBNET_1=' "$LATEST_DAY1" 2>/dev/null | cut -d'=' -f2 || echo "")}
PRIVATE_SUBNET_2=${PRIVATE_SUBNET_2:-$(grep -m 1 '^PRIVATE_SUBNET_2=' "$LATEST_DAY1" 2>/dev/null | cut -d'=' -f2 || echo "")}
NODE_ROLE_ARN=${NODE_ROLE_ARN:-$(grep -m 1 '^NODE_ROLE_ARN=' "$LATEST_DAY1" 2>/dev/null | cut -d'=' -f2 || echo "")}
NODE_SG=${NODE_SG:-$(grep -m 1 '^NODE_SG=' "$LATEST_DAY1" 2>/dev/null | cut -d'=' -f2 || echo "")}

echo "=========================================="
echo "Creating EKS Node Group"
echo "=========================================="
echo ""
echo "Cluster: $CLUSTER_NAME"
echo "Node Group: $NODEGROUP_NAME"
echo "Node Type: $NODE_TYPE"
echo "Nodes: $NODES (min: $NODES_MIN, max: $NODES_MAX)"
echo "Region: $REGION"
echo ""

# Check if cluster exists
echo "🔍 Checking if cluster exists..."
if ! eksctl get cluster --name $CLUSTER_NAME --region $REGION &>/dev/null; then
    echo "❌ Cluster $CLUSTER_NAME not found!"
    echo "   Please run day1-aws-setup.sh first to create the cluster."
    exit 1
fi
echo "✅ Cluster found: $CLUSTER_NAME"
echo ""

# Check if node group already exists
echo "🔍 Checking if node group exists..."
if eksctl get nodegroup --cluster=$CLUSTER_NAME --name=$NODEGROUP_NAME --region=$REGION &>/dev/null; then
    echo "⚠️  Node group $NODEGROUP_NAME already exists!"
    echo ""
    echo "To scale it up, run:"
    echo "  eksctl scale nodegroup --cluster=$CLUSTER_NAME --name=$NODEGROUP_NAME --nodes=$NODES --region=$REGION"
    exit 0
fi

echo "✅ Node group does not exist, creating..."
echo ""

# Build eksctl command
# Note: eksctl will automatically create IAM role for the nodegroup
# The existing EteliosEKSNodeGroupRole will be used if eksctl detects it,
# otherwise eksctl will create a new role automatically
CMD="eksctl create nodegroup \
  --cluster=$CLUSTER_NAME \
  --name=$NODEGROUP_NAME \
  --region=$REGION \
  --node-type=$NODE_TYPE \
  --nodes=$NODES \
  --nodes-min=$NODES_MIN \
  --nodes-max=$NODES_MAX \
  --managed"

# Add subnet if available
if [ -n "$PRIVATE_SUBNET_1" ] && [ -n "$PRIVATE_SUBNET_2" ]; then
    CMD="$CMD --subnet-ids=$PRIVATE_SUBNET_1,$PRIVATE_SUBNET_2"
    # Private subnets require --node-private-networking flag (correct flag name)
    CMD="$CMD --node-private-networking"
    echo "📋 Using private subnets: $PRIVATE_SUBNET_1, $PRIVATE_SUBNET_2"
    echo "📋 Enabling private networking (nodes won't have public IPs)"
elif [ -n "$PUBLIC_SUBNET_1" ] && [ -n "$PUBLIC_SUBNET_2" ]; then
    # Fallback to public subnets if private not available
    CMD="$CMD --subnet-ids=$PUBLIC_SUBNET_1,$PUBLIC_SUBNET_2"
    echo "📋 Using public subnets: $PUBLIC_SUBNET_1, $PUBLIC_SUBNET_2"
    echo "📋 Note: Nodes will have public IPs (secured by security groups)"
fi

# Note: eksctl automatically creates/manages IAM role for nodegroups
# Managed node groups automatically use cluster security group
echo "📋 Note: eksctl will automatically create/manage IAM role for nodegroup"
if [ -n "$NODE_ROLE_ARN" ]; then
    echo "   Existing role available: $NODE_ROLE_ARN"
    echo "   (eksctl will use or create as needed)"
fi

echo ""
echo "🚀 Creating node group (this will take 5-10 minutes)..."
echo ""

# Execute command
eval $CMD

echo ""
echo "⏳ Waiting for nodes to be ready..."
kubectl wait --for=condition=Ready nodes --all --timeout=600s || echo "⚠️  Some nodes may still be starting"

echo ""
echo "📊 Node Status:"
kubectl get nodes -o wide

echo ""
echo "📊 Pod Status:"
kubectl get pods -n etelios-prod --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l | xargs echo "  Pending Pods:"
kubectl get pods -n etelios-prod --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | xargs echo "  Running Pods:"

echo ""
echo "✅ Node group creation complete!"
echo ""
echo "💡 Monitor pod status:"
echo "  kubectl get pods -n etelios-prod -w"
