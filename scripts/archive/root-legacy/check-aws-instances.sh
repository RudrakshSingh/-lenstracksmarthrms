#!/bin/bash

###############################################################################
# Check AWS Instances Status
###############################################################################

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

REGION="ap-south-1"

echo "=========================================="
echo "🔍 AWS Instances Status Check"
echo "=========================================="
echo ""

# Check all instances
echo "All EC2 Instances:"
echo "----------------------------------------"
aws ec2 describe-instances --region $REGION \
  --query 'Reservations[*].Instances[*].[InstanceId,InstanceType,State.Name,Tags[?Key==`Name`].Value|[0]]' \
  --output table

echo ""
echo "Instance Status Summary:"
echo "----------------------------------------"

RUNNING=$(aws ec2 describe-instances --region $REGION \
  --filters "Name=instance-state-name,Values=running" \
  --query 'Reservations[*].Instances[*].InstanceId' \
  --output text | wc -w | tr -d ' ')

STOPPED=$(aws ec2 describe-instances --region $REGION \
  --filters "Name=instance-state-name,Values=stopped" \
  --query 'Reservations[*].Instances[*].InstanceId' \
  --output text | wc -w | tr -d ' ')

STOPPING=$(aws ec2 describe-instances --region $REGION \
  --filters "Name=instance-state-name,Values=stopping" \
  --query 'Reservations[*].Instances[*].InstanceId' \
  --output text | wc -w | tr -d ' ')

echo -e "${GREEN}Running: $RUNNING${NC}"
echo -e "${YELLOW}Stopped: $STOPPED${NC}"
echo -e "${YELLOW}Stopping: $STOPPING${NC}"
echo ""

# If there are stopped instances, offer to start them
if [ "$STOPPED" -gt 0 ]; then
  echo "=========================================="
  echo "⚠️  Found $STOPPED stopped instance(s)"
  echo "=========================================="
  echo ""
  
  STOPPED_IDS=$(aws ec2 describe-instances --region $REGION \
    --filters "Name=instance-state-name,Values=stopped" \
    --query 'Reservations[*].Instances[*].InstanceId' \
    --output text)
  
  echo "Stopped Instance IDs:"
  echo "$STOPPED_IDS" | tr '\t' '\n'
  echo ""
  echo "To start them, run:"
  echo "aws ec2 start-instances --region $REGION --instance-ids $STOPPED_IDS"
else
  echo -e "${GREEN}✅ All instances are running!${NC}"
fi

echo ""
