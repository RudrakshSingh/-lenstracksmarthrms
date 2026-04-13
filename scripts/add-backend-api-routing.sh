#!/bin/bash

# Add Backend API Routing Rules to ALB

set -e

echo "🔧 Adding Backend API Routing to ALB..."
echo "====================================="
echo ""

REGION="ap-south-1"
ALB_ARN="arn:aws:elasticloadbalancing:ap-south-1:383234048604:loadbalancer/app/etelios-frontend-alb/e1ec84dbfdaf5697"
VPC_ID=$(aws eks describe-cluster --name etelios-prod-v2 --region "$REGION" --query 'cluster.resourcesVpcConfig.vpcId' --output text 2>&1)

if [ -z "$VPC_ID" ] || [ "$VPC_ID" == "None" ]; then
  echo "⚠️  Could not get VPC ID, trying alternative method..."
  VPC_ID=$(aws ec2 describe-vpcs --region "$REGION" --filters "Name=tag:Name,Values=*etelios*" --query 'Vpcs[0].VpcId' --output text 2>&1)
fi

echo "VPC ID: $VPC_ID"
echo ""

# Get listener ARN
LISTENER_ARN=$(aws elbv2 describe-listeners \
  --load-balancer-arn "$ALB_ARN" \
  --region "$REGION" \
  --query 'Listeners[?Port==`80`].ListenerArn' \
  --output text 2>&1)

echo "Listener ARN: $LISTENER_ARN"
echo ""

# Get service endpoints
echo "1️⃣ Getting Kubernetes service endpoints..."
AUTH_ENDPOINT=$(kubectl get endpoints -n etelios-prod auth-service -o jsonpath='{.subsets[0].addresses[0].ip}:{.subsets[0].ports[0].port}' 2>&1)
HR_ENDPOINT=$(kubectl get endpoints -n etelios-prod hr-service -o jsonpath='{.subsets[0].addresses[0].ip}:{.subsets[0].ports[0].port}' 2>&1)
ATTENDANCE_ENDPOINT=$(kubectl get endpoints -n etelios-prod attendance-service -o jsonpath='{.subsets[0].addresses[0].ip}:{.subsets[0].ports[0].port}' 2>&1)

echo "Auth Service: $AUTH_ENDPOINT"
echo "HR Service: $HR_ENDPOINT"
echo "Attendance Service: $ATTENDANCE_ENDPOINT"
echo ""

# Create or get target groups
echo "2️⃣ Creating/Getting Target Groups..."

# Auth Service Target Group
AUTH_TG=$(aws elbv2 describe-target-groups \
  --region "$REGION" \
  --names etelios-auth-api-tg \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text 2>&1)

if [ -z "$AUTH_TG" ] || [ "$AUTH_TG" == "None" ]; then
  echo "Creating auth service target group..."
  AUTH_TG=$(aws elbv2 create-target-group \
    --name etelios-auth-api-tg \
    --protocol HTTP \
    --port 3001 \
    --vpc-id "$VPC_ID" \
    --health-check-path /health \
    --health-check-protocol HTTP \
    --region "$REGION" \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text 2>&1)
  echo "✅ Created: $AUTH_TG"
else
  echo "✅ Exists: $AUTH_TG"
fi

# HR Service Target Group
HR_TG=$(aws elbv2 describe-target-groups \
  --region "$REGION" \
  --names etelios-hr-api-tg \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text 2>&1)

if [ -z "$HR_TG" ] || [ "$HR_TG" == "None" ]; then
  echo "Creating HR service target group..."
  HR_TG=$(aws elbv2 create-target-group \
    --name etelios-hr-api-tg \
    --protocol HTTP \
    --port 3002 \
    --vpc-id "$VPC_ID" \
    --health-check-path /health \
    --health-check-protocol HTTP \
    --region "$REGION" \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text 2>&1)
  echo "✅ Created: $HR_TG"
else
  echo "✅ Exists: $HR_TG"
fi

# Attendance Service Target Group
ATTENDANCE_TG=$(aws elbv2 describe-target-groups \
  --region "$REGION" \
  --names etelios-attendance-api-tg \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text 2>&1)

if [ -z "$ATTENDANCE_TG" ] || [ "$ATTENDANCE_TG" == "None" ]; then
  echo "Creating attendance service target group..."
  ATTENDANCE_TG=$(aws elbv2 create-target-group \
    --name etelios-attendance-api-tg \
    --protocol HTTP \
    --port 3003 \
    --vpc-id "$VPC_ID" \
    --health-check-path /health \
    --health-check-protocol HTTP \
    --region "$REGION" \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text 2>&1)
  echo "✅ Created: $ATTENDANCE_TG"
else
  echo "✅ Exists: $ATTENDANCE_TG"
fi

echo ""
echo "3️⃣ Registering targets..."

# Register auth service targets
if [ -n "$AUTH_ENDPOINT" ] && [[ "$AUTH_ENDPOINT" == *":"* ]]; then
  AUTH_IP=$(echo "$AUTH_ENDPOINT" | cut -d: -f1)
  AUTH_PORT=$(echo "$AUTH_ENDPOINT" | cut -d: -f2)
  echo "Registering auth service: $AUTH_IP:$AUTH_PORT"
  aws elbv2 register-targets \
    --target-group-arn "$AUTH_TG" \
    --targets "Id=$AUTH_IP,Port=$AUTH_PORT" \
    --region "$REGION" 2>&1 | grep -v "already registered" || echo "Target may already be registered"
fi

# Register HR service targets
if [ -n "$HR_ENDPOINT" ] && [[ "$HR_ENDPOINT" == *":"* ]]; then
  HR_IP=$(echo "$HR_ENDPOINT" | cut -d: -f1)
  HR_PORT=$(echo "$HR_ENDPOINT" | cut -d: -f2)
  echo "Registering HR service: $HR_IP:$HR_PORT"
  aws elbv2 register-targets \
    --target-group-arn "$HR_TG" \
    --targets "Id=$HR_IP,Port=$HR_PORT" \
    --region "$REGION" 2>&1 | grep -v "already registered" || echo "Target may already be registered"
fi

# Register attendance service targets
if [ -n "$ATTENDANCE_ENDPOINT" ] && [[ "$ATTENDANCE_ENDPOINT" == *":"* ]]; then
  ATT_IP=$(echo "$ATTENDANCE_ENDPOINT" | cut -d: -f1)
  ATT_PORT=$(echo "$ATTENDANCE_ENDPOINT" | cut -d: -f2)
  echo "Registering attendance service: $ATT_IP:$ATT_PORT"
  aws elbv2 register-targets \
    --target-group-arn "$ATTENDANCE_TG" \
    --targets "Id=$ATT_IP,Port=$ATT_PORT" \
    --region "$REGION" 2>&1 | grep -v "already registered" || echo "Target may already be registered"
fi

echo ""
echo "4️⃣ Adding listener rules..."

# Get next available priority (after existing rules)
NEXT_PRIORITY=100

# Add rule for /api/auth/*
echo "Adding rule for /api/auth/* (Priority: $NEXT_PRIORITY)..."
aws elbv2 create-rule \
  --listener-arn "$LISTENER_ARN" \
  --priority $NEXT_PRIORITY \
  --conditions "Field=path-pattern,Values=/api/auth/*" \
  --actions "Type=forward,TargetGroupArn=$AUTH_TG" \
  --region "$REGION" 2>&1 | grep -v "already exists" || echo "Rule may already exist"

NEXT_PRIORITY=$((NEXT_PRIORITY + 10))

# Add rule for /api/hr/*
echo "Adding rule for /api/hr/* (Priority: $NEXT_PRIORITY)..."
aws elbv2 create-rule \
  --listener-arn "$LISTENER_ARN" \
  --priority $NEXT_PRIORITY \
  --conditions "Field=path-pattern,Values=/api/hr/*" \
  --actions "Type=forward,TargetGroupArn=$HR_TG" \
  --region "$REGION" 2>&1 | grep -v "already exists" || echo "Rule may already exist"

NEXT_PRIORITY=$((NEXT_PRIORITY + 10))

# Add rule for /api/attendance/*
echo "Adding rule for /api/attendance/* (Priority: $NEXT_PRIORITY)..."
aws elbv2 create-rule \
  --listener-arn "$LISTENER_ARN" \
  --priority $NEXT_PRIORITY \
  --conditions "Field=path-pattern,Values=/api/attendance/*" \
  --actions "Type=forward,TargetGroupArn=$ATTENDANCE_TG" \
  --region "$REGION" 2>&1 | grep -v "already exists" || echo "Rule may already exist"

echo ""
echo "====================================="
echo "✅ Backend API Routing Added!"
echo ""
echo "🌐 ALB URL: http://etelios-frontend-alb-557163772.ap-south-1.elb.amazonaws.com"
echo ""
echo "📋 Routes Added:"
echo "   /api/auth/* -> Auth Service (port 3001)"
echo "   /api/hr/* -> HR Service (port 3002)"
echo "   /api/attendance/* -> Attendance Service (port 3003)"
echo ""
echo "🧪 Test now:"
echo "   curl http://etelios-frontend-alb-557163772.ap-south-1.elb.amazonaws.com/api/auth/login"
echo ""
