#!/bin/bash

###############################################################################
# Scale Up EKS Nodes to Increase CPU Capacity
###############################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

CLUSTER_NAME="etelios-prod-v2"
NODEGROUP_NAME="main-workers"
REGION="ap-south-1"
TARGET_NODES=10

echo "=========================================="
echo "🚀 Scaling Up CPU Capacity"
echo "=========================================="
echo ""
echo "Cluster: $CLUSTER_NAME"
echo "Nodegroup: $NODEGROUP_NAME"
echo "Current Nodes: 5 (2 vCPUs each = 10 vCPUs total)"
echo "Target Nodes: $TARGET_NODES (2 vCPUs each = 20 vCPUs total)"
echo "CPU Increase: 2x (10 → 20 vCPUs)"
echo ""

# Check current status
echo "📊 Current Status:"
CURRENT_NODES=$(kubectl get nodes --no-headers 2>/dev/null | wc -l | tr -d ' ')
PENDING_PODS=$(kubectl get pods -n etelios-prod --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l | tr -d ' ')
echo "  Current Nodes: $CURRENT_NODES"
echo "  Pending Pods: $PENDING_PODS"
echo ""

# Scale up nodegroup
echo "🚀 Scaling up nodegroup to $TARGET_NODES nodes..."
aws eks update-nodegroup-config \
  --cluster-name $CLUSTER_NAME \
  --nodegroup-name $NODEGROUP_NAME \
  --scaling-config minSize=5,maxSize=10,desiredSize=$TARGET_NODES \
  --region $REGION

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Nodegroup scaling initiated!${NC}"
  echo ""
  echo "⏳ New nodes will be ready in 5-10 minutes"
  echo "   Pending pods will automatically schedule once nodes are ready"
  echo ""
  echo "📊 Monitor progress:"
  echo "   kubectl get nodes -w"
  echo "   kubectl get pods -n etelios-prod --field-selector=status.phase=Pending"
  echo ""
else
  echo -e "${RED}❌ Scaling failed${NC}"
  exit 1
fi

echo "✅ CPU scaling complete!"
echo ""
echo "💡 After nodes are ready, pods will automatically start"
