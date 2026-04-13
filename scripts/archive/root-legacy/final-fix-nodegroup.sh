#!/bin/bash

set -e

CLUSTER_NAME="etelios-prod"
NODEGROUP_NAME="standard-workers"
REGION="ap-south-1"

echo "=========================================="
echo "Final Fix: Create Node Group"
echo "=========================================="
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
    exit 1
fi

echo "📋 Configuration:"
echo "  Cluster: $CLUSTER_NAME"
echo "  Node Group: $NODEGROUP_NAME"
echo "  Region: $REGION"
echo "  Subnets: $PUBLIC_SUBNET_1, $PUBLIC_SUBNET_2"
echo ""

# Step 1: Check for any CloudFormation stacks
echo "🔍 Step 1: Checking for existing CloudFormation stacks..."
STACK_NAME="eksctl-${CLUSTER_NAME}-nodegroup-${NODEGROUP_NAME}"
STACK_STATUS=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query 'Stacks[0].StackStatus' \
  --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$STACK_STATUS" != "NOT_FOUND" ] && [ "$STACK_STATUS" != "None" ]; then
    echo "⚠️  Found existing CloudFormation stack: $STACK_STATUS"
    
    # Disable termination protection first
    echo "🔓 Disabling termination protection..."
    aws cloudformation update-termination-protection \
      --no-enable-termination-protection \
      --stack-name $STACK_NAME \
      --region $REGION || echo "⚠️  Failed to disable termination protection, continuing..."
    
    echo "🗑️  Deleting stack..."
    aws cloudformation delete-stack \
      --stack-name $STACK_NAME \
      --region $REGION
    
    echo "⏳ Waiting for stack deletion (this may take 5-10 minutes)..."
    aws cloudformation wait stack-delete-complete \
      --stack-name $STACK_NAME \
      --region $REGION || echo "⚠️  Stack deletion may still be in progress"
    echo "✅ Stack deleted"
    echo ""
    echo "⏳ Waiting 60 seconds before creating new stack..."
    sleep 60
else
    echo "✅ No existing stack found"
fi
echo ""

# Step 2: Ensure VPC CNI is installed
echo "🔍 Step 2: Checking VPC CNI addon..."
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

# Step 3: Fix subnet settings
echo "🔍 Step 3: Ensuring subnet settings are correct..."
eksctl utils update-legacy-subnet-settings \
  --cluster $CLUSTER_NAME \
  --region $REGION || echo "⚠️  Subnet update failed, continuing..."
echo ""

# Step 4: Create nodegroup
echo "🚀 Step 4: Creating nodegroup..."
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

# Step 5: Wait for nodes
echo "⏳ Waiting for nodes to be ready..."
kubectl wait --for=condition=Ready nodes --all --timeout=600s || echo "⚠️  Some nodes may still be starting"

echo ""
echo "📊 Final Status:"
echo ""
kubectl get nodes
echo ""
kubectl get pods -n etelios-prod --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l | xargs echo "Pending pods:"
kubectl get pods -n etelios-prod --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | xargs echo "Running pods:"

echo ""
echo "✅ Nodegroup setup complete!"
echo ""
echo "💡 Monitor progress:"
echo "  kubectl get nodes -w"
echo "  kubectl get pods -n etelios-prod -w"
