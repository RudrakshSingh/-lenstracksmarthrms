#!/bin/bash

set -e

CLUSTER_NAME="etelios-prod"
NODEGROUP_NAME="standard-workers"
REGION="ap-south-1"
TARGET_NODES=10

echo "=========================================="
echo "Scaling Up EKS Node Group"
echo "=========================================="
echo ""
echo "Cluster: $CLUSTER_NAME"
echo "Node Group: $NODEGROUP_NAME"
echo "Target Nodes: $TARGET_NODES"
echo "Region: $REGION"
echo ""

# Check current node count
echo "📊 Current Node Count:"
kubectl get nodes --no-headers 2>/dev/null | wc -l | xargs echo "  Nodes:"
echo ""

# Check if node group exists
echo "🔍 Checking if node group exists..."
if ! eksctl get nodegroup --cluster=$CLUSTER_NAME --name=$NODEGROUP_NAME --region=$REGION &>/dev/null; then
    echo "❌ Node group $NODEGROUP_NAME not found!"
    echo ""
    echo "💡 The node group doesn't exist. Please create it first:"
    echo "   ./create-nodegroup.sh"
    echo ""
    exit 1
fi

echo "✅ Node group found: $NODEGROUP_NAME"
echo ""

# Scale up
echo "🚀 Scaling up node group..."
eksctl scale nodegroup \
  --cluster=$CLUSTER_NAME \
  --name=$NODEGROUP_NAME \
  --nodes=$TARGET_NODES \
  --region=$REGION

echo ""
echo "⏳ Waiting for nodes to be ready (this may take 5-10 minutes)..."
kubectl wait --for=condition=Ready nodes --all --timeout=600s || echo "⚠️  Some nodes may still be starting"

echo ""
echo "📊 Updated Node Status:"
kubectl get nodes -o wide

echo ""
echo "📊 Pod Status (checking if pods are scheduling...):"
kubectl get pods -n etelios-prod --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l | xargs echo "  Pending Pods:"
kubectl get pods -n etelios-prod --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | xargs echo "  Running Pods:"

echo ""
echo "✅ Node scaling complete!"
echo ""
echo "💡 Monitor pod status:"
echo "  kubectl get pods -n etelios-prod -w"
