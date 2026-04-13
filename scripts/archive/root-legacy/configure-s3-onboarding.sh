#!/bin/bash

# Configure S3 for Onboarding Documents in HR Service
# This script updates the Kubernetes deployment with S3 environment variables

set -e

AWS_REGION="ap-south-1"
AWS_S3_BUCKET_NAME="etelios-prod-storage"
CLUSTER_NAME="etelios-prod-v2"
NAMESPACE="etelios-prod"
SERVICE="hr-service"

echo "=========================================="
echo "🔧 Configuring S3 for Onboarding Documents"
echo "=========================================="
echo ""

echo "📋 Configuration:"
echo "   AWS_REGION: ${AWS_REGION}"
echo "   AWS_S3_BUCKET_NAME: ${AWS_S3_BUCKET_NAME}"
echo "   Service: ${SERVICE}"
echo "   Namespace: ${NAMESPACE}"
echo ""

# Update kubeconfig
echo "1️⃣  Updating kubeconfig..."
aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME

echo ""
echo "2️⃣  Setting environment variables in deployment..."
kubectl set env deployment/$SERVICE \
  -n $NAMESPACE \
  AWS_REGION=$AWS_REGION \
  AWS_S3_BUCKET_NAME=$AWS_S3_BUCKET_NAME

echo ""
echo "3️⃣  Verifying environment variables..."
kubectl get deployment/$SERVICE -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="AWS_REGION")]}' | jq -r '.value' || echo "⚠️  AWS_REGION not found"
kubectl get deployment/$SERVICE -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="AWS_S3_BUCKET_NAME")]}' | jq -r '.value' || echo "⚠️  AWS_S3_BUCKET_NAME not found"

echo ""
echo "4️⃣  Restarting deployment to apply changes..."
kubectl rollout restart deployment/$SERVICE -n $NAMESPACE

echo ""
echo "5️⃣  Waiting for rollout (120s timeout)..."
kubectl rollout status deployment/$SERVICE -n $NAMESPACE --timeout=120s || echo "⚠️  Rollout timeout - check pods manually"

echo ""
echo "6️⃣  Checking pod status..."
kubectl get pods -n $NAMESPACE -l app=$SERVICE

echo ""
echo "7️⃣  Checking S3 initialization in logs..."
sleep 5
kubectl logs -n $NAMESPACE -l app=$SERVICE --tail=50 | grep -i "s3\|storage" || echo "⚠️  S3 logs not found yet (may need more time)"

echo ""
echo "=========================================="
echo "✅ S3 Configuration Complete!"
echo "=========================================="
echo ""
echo "📋 Environment Variables Set:"
echo "   ✅ AWS_REGION=${AWS_REGION}"
echo "   ✅ AWS_S3_BUCKET_NAME=${AWS_S3_BUCKET_NAME}"
echo ""
echo "📋 Next Steps:"
echo "   1. Verify S3 bucket exists: aws s3 ls s3://${AWS_S3_BUCKET_NAME}"
echo "   2. Check IAM role has S3 permissions"
echo "   3. Test onboarding document upload"
echo ""
echo "📋 Check logs for S3 initialization:"
echo "   kubectl logs -n $NAMESPACE -l app=$SERVICE --tail=100 | grep -i s3"
echo ""
