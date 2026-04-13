#!/bin/bash

CLUSTER_NAME="etelios-prod"
REGION="ap-south-1"

echo "=========================================="
echo "Fixing Subnet Settings"
echo "=========================================="
echo ""

echo "🔧 Enabling MapPublicIpOnLaunch for public subnets..."
eksctl utils update-legacy-subnet-settings \
  --cluster $CLUSTER_NAME \
  --region $REGION

echo ""
echo "✅ Subnet settings updated!"
echo ""
echo "📊 Now you can create nodegroup:"
echo "  ./create-nodegroup.sh"
echo "  or"
echo "  ./fix-and-retry-nodegroup.sh"
