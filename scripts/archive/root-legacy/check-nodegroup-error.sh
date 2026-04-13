#!/bin/bash

STACK_NAME="eksctl-etelios-prod-nodegroup-standard-workers"
REGION="ap-south-1"

echo "=========================================="
echo "Diagnosing Node Group Creation Failure"
echo "=========================================="
echo ""

echo "📊 CloudFormation Stack Status:"
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query 'Stacks[0].[StackStatus,StackStatusReason]' \
  --output text 2>&1

echo ""
echo "📊 Failed Resources:"
aws cloudformation describe-stack-events \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`].[LogicalResourceId,ResourceStatusReason,Timestamp]' \
  --output table 2>&1 | head -n 20

echo ""
echo "📊 Recent Events (last 10):"
aws cloudformation describe-stack-events \
  --stack-name $STACK_NAME \
  --region $REGION \
  --max-items 10 \
  --query 'StackEvents[].[Timestamp,ResourceStatus,LogicalResourceId,ResourceStatusReason]' \
  --output table 2>&1

echo ""
echo "💡 Check AWS Console for more details:"
echo "   https://console.aws.amazon.com/cloudformation/home?region=$REGION#/stacks"
