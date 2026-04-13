#!/bin/bash

set -e

echo "=========================================="
echo "Deploy Attendance Service to DocumentDB"
echo "=========================================="
echo ""

# Load DocumentDB credentials
LATEST=$(ls -t aws-resources-day2-*.txt 2>/dev/null | head -1)
if [ -z "$LATEST" ] || [ ! -f "$LATEST" ]; then
  echo "❌ Error: aws-resources-day2-*.txt file not found"
  exit 1
fi

DOCDB_ENDPOINT=$(grep "^DOCDB_ENDPOINT=" "$LATEST" | cut -d'=' -f2)
DOCDB_USER=$(grep "^DOCDB_MASTER_USER=" "$LATEST" | cut -d'=' -f2)
DOCDB_PASS=$(grep "^DOCDB_MASTER_PASSWORD=" "$LATEST" | cut -d'=' -f2)

if [ -z "$DOCDB_ENDPOINT" ] || [ -z "$DOCDB_USER" ] || [ -z "$DOCDB_PASS" ]; then
  echo "❌ Error: DocumentDB credentials incomplete in $LATEST"
  exit 1
fi

echo "✅ DocumentDB Credentials Loaded"
echo "   Endpoint: $DOCDB_ENDPOINT"
echo "   User: $DOCDB_USER"
echo ""

# Step 1: Create/Update Secret
echo "Step 1: Creating/Updating docdb-credentials secret..."
kubectl create secret generic docdb-credentials \
  -n etelios-prod \
  --from-literal=endpoint="${DOCDB_ENDPOINT}:27017" \
  --from-literal=username="$DOCDB_USER" \
  --from-literal=password="$DOCDB_PASS" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "✅ Secret created/updated"
echo ""

# Step 2: Build Docker Image
echo "Step 2: Building Docker image..."
cd microservices/attendance-service

docker build -t etelios-attendance-service:documentdb . || {
  echo "❌ Docker build failed"
  exit 1
}

echo "✅ Docker image built"
echo ""

# Step 3: Tag for ECR
echo "Step 3: Tagging for ECR..."
docker tag etelios-attendance-service:documentdb \
  383234048604.dkr.ecr.ap-south-1.amazonaws.com/etelios-attendance-service:latest

echo "✅ Image tagged"
echo ""

# Step 4: Login to ECR
echo "Step 4: Logging into ECR..."
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin \
  383234048604.dkr.ecr.ap-south-1.amazonaws.com

echo "✅ Logged into ECR"
echo ""

# Step 5: Push to ECR
echo "Step 5: Pushing to ECR..."
docker push 383234048604.dkr.ecr.ap-south-1.amazonaws.com/etelios-attendance-service:latest

echo "✅ Image pushed to ECR"
echo ""

# Step 6: Apply Deployment
echo "Step 6: Applying deployment..."
cd ../..
kubectl apply -f k8s/etelios-prod/attendance-service-deployment.yaml

echo "✅ Deployment applied"
echo ""

# Step 7: Restart Service
echo "Step 7: Restarting service..."
kubectl rollout restart deployment/attendance-service -n etelios-prod

echo "✅ Service restart initiated"
echo ""

# Step 8: Wait for Rollout
echo "Step 8: Waiting for rollout..."
kubectl rollout status deployment/attendance-service -n etelios-prod --timeout=120s

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "📊 Attendance Service is now using DocumentDB:"
echo "   Database: etelios"
echo "   Endpoint: $DOCDB_ENDPOINT"
echo ""
echo "📋 Check logs:"
echo "   kubectl logs deployment/attendance-service -n etelios-prod | grep -i database"
echo ""
echo "📊 Check DocumentDB dashboard for 'etelios' database"
