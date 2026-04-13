#!/bin/bash

set -e

CLUSTER_NAME="etelios-prod"
NODEGROUP_NAME="standard-workers"
REGION="ap-south-1"

echo "=========================================="
echo "Force Creating Node Group"
echo "=========================================="
echo ""

# Check if nodegroup exists
echo "🔍 Checking if nodegroup exists..."
if eksctl get nodegroup --cluster=$CLUSTER_NAME --name=$NODEGROUP_NAME --region=$REGION &>/dev/null; then
    echo "⚠️  Nodegroup exists but may be in failed state"
    echo "📊 Current status:"
    eksctl get nodegroup --cluster=$CLUSTER_NAME --name=$NODEGROUP_NAME --region=$REGION
    
    echo ""
    echo "🗑️  Deleting existing nodegroup..."
    eksctl delete nodegroup \
      --cluster=$CLUSTER_NAME \
      --name=$NODEGROUP_NAME \
      --region=$REGION \
      --wait || echo "⚠️  Delete may have failed, continuing..."
    
    echo ""
    echo "⏳ Waiting 60 seconds for cleanup..."
    sleep 60
else
    echo "✅ No existing nodegroup found"
fi

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

echo "🚀 Creating nodegroup with public subnets..."
echo "📋 Subnets: $PUBLIC_SUBNET_1, $PUBLIC_SUBNET_2"
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
  --subnet-ids=$PUBLIC_SUBNET_1,$PUBLIC_SUBNET_2

echo ""
echo "✅ Nodegroup creation initiated!"
echo ""
echo "📊 Monitor progress:"
echo "  kubectl get nodes -w"
echo "  eksctl get nodegroup --cluster=$CLUSTER_NAME --region=$REGION"
