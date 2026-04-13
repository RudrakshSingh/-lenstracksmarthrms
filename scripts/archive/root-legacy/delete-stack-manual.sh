#!/bin/bash

STACK_NAME="eksctl-etelios-prod-nodegroup-standard-workers"
REGION="ap-south-1"

echo "=========================================="
echo "Manual Stack Deletion"
echo "=========================================="
echo ""

echo "🔓 Step 1: Disabling termination protection..."
aws cloudformation update-termination-protection \
  --no-enable-termination-protection \
  --stack-name $STACK_NAME \
  --region $REGION

echo ""
echo "🗑️  Step 2: Deleting stack..."
aws cloudformation delete-stack \
  --stack-name $STACK_NAME \
  --region $REGION

echo ""
echo "⏳ Waiting for stack deletion (this may take 5-10 minutes)..."
aws cloudformation wait stack-delete-complete \
  --stack-name $STACK_NAME \
  --region $REGION

echo ""
echo "✅ Stack deleted successfully!"
echo ""
echo "Now you can create a fresh nodegroup:"
echo "  ./final-fix-nodegroup.sh"
