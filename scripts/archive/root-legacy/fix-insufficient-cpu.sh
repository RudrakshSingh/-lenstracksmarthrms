#!/bin/bash

CLUSTER_NAME="etelios-prod"
NODEGROUP_NAME="standard-workers-v2"
REGION="ap-south-1"
NAMESPACE="etelios-prod"

echo "=========================================="
echo "Fixing Insufficient CPU Issue"
echo "=========================================="
echo ""

echo "📊 Current Status:"
echo "  Nodes: $(kubectl get nodes --no-headers 2>/dev/null | wc -l | tr -d ' ')"
echo "  Node Type: t3.medium (2 vCPUs each)"
echo "  Total CPU: $(kubectl get nodes -o jsonpath='{.items[*].status.capacity.cpu}' 2>/dev/null | tr ' ' '+' | bc 2>/dev/null || echo '~10') vCPUs"
echo "  Pending Pods: $(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l | tr -d ' ')"
echo ""

echo "💡 Problem: Pods need more CPU than available"
echo "   Solution: Scale up nodegroup to 10 nodes"
echo ""

# Check current node count
CURRENT_NODES=$(kubectl get nodes --no-headers 2>/dev/null | wc -l | tr -d ' ')

if [ "$CURRENT_NODES" -lt 10 ]; then
    echo "🚀 Scaling up nodegroup to 10 nodes..."
    eksctl scale nodegroup \
      --cluster=$CLUSTER_NAME \
      --name=$NODEGROUP_NAME \
      --nodes=10 \
      --region=$REGION
    
    echo ""
    echo "⏳ Waiting for new nodes to be ready (this may take 5-10 minutes)..."
    echo "   You can monitor with: kubectl get nodes -w"
    echo ""
    
    # Wait a bit and check
    sleep 30
    NEW_NODES=$(kubectl get nodes --no-headers 2>/dev/null | wc -l | tr -d ' ')
    echo "📊 Current nodes: $NEW_NODES"
    echo ""
    echo "✅ Nodegroup scaling initiated!"
    echo "   New nodes will be ready in 5-10 minutes"
    echo "   Pods will automatically schedule once nodes are ready"
else
    echo "✅ Already have $CURRENT_NODES nodes"
    echo "   If pods still pending, check resource requests in deployments"
fi

echo ""
echo "💡 Alternative: Reduce resource requests in deployments"
echo "   kubectl edit deployment <service-name> -n $NAMESPACE"
echo "   Reduce CPU requests (e.g., from 500m to 100m)"
