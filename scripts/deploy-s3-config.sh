#!/bin/bash

# S3 Configuration Deployment Script
# This script applies S3 configuration for onboarding documents and attendance selfies

set -e

echo "=== S3 Image Storage Configuration Deployment ==="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install kubectl first."
    exit 1
fi

# Check if aws cli is available
if ! command -v aws &> /dev/null; then
    echo "⚠️  AWS CLI not found. S3 bucket verification will be skipped."
fi

echo "1️⃣  Verifying S3 Bucket..."
if command -v aws &> /dev/null; then
    if aws s3 ls s3://etelios-prod-storage --region ap-south-1 &> /dev/null; then
        echo -e "${GREEN}✅ S3 Bucket exists: etelios-prod-storage${NC}"
    else
        echo -e "${YELLOW}⚠️  S3 Bucket not found or not accessible${NC}"
        echo "   Creating bucket..."
        aws s3 mb s3://etelios-prod-storage --region ap-south-1 || echo "   Bucket creation failed or already exists"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping bucket verification (AWS CLI not available)${NC}"
fi

echo ""
echo "2️⃣  Applying Attendance Service Deployment with S3 Config..."
kubectl apply -f k8s/etelios-prod/attendance-service-deployment.yaml

echo ""
echo "3️⃣  Restarting Attendance Service to pick up new env vars..."
kubectl rollout restart deployment/attendance-service -n etelios-prod

echo ""
echo "4️⃣  Waiting for rollout to complete..."
kubectl rollout status deployment/attendance-service -n etelios-prod --timeout=300s

echo ""
echo "5️⃣  Verifying Environment Variables..."
echo ""
echo "HR Service AWS Config:"
kubectl exec -n etelios-prod deployment/hr-service -- env 2>/dev/null | grep -E "AWS_REGION|AWS_S3" || echo "   No AWS env vars found"

echo ""
echo "Attendance Service AWS Config:"
kubectl exec -n etelios-prod deployment/attendance-service -- env 2>/dev/null | grep -E "AWS_REGION|AWS_S3" || echo "   No AWS env vars found"

echo ""
echo "6️⃣  Checking S3 Initialization Logs..."
echo ""
echo "HR Service S3 Logs:"
kubectl logs -n etelios-prod -l app=hr-service --tail=20 2>/dev/null | grep -i "s3\|storage" | tail -5 || echo "   No S3 logs found"

echo ""
echo "Attendance Service S3 Logs:"
kubectl logs -n etelios-prod -l app=attendance-service --tail=20 2>/dev/null | grep -i "s3\|storage" | tail -5 || echo "   No S3 logs found"

echo ""
echo -e "${GREEN}✅ S3 Configuration Deployment Complete!${NC}"
echo ""
echo "📝 Next Steps:"
echo "   1. Test onboarding document upload:"
echo "      POST /api/hr/onboarding/upload"
echo ""
echo "   2. Test attendance selfie upload:"
echo "      POST /api/attendance/checkin (with selfie file or base64)"
echo ""
echo "   3. Verify files in S3:"
echo "      aws s3 ls s3://etelios-prod-storage/onboarding/ --recursive"
echo "      aws s3 ls s3://etelios-prod-storage/attendance/selfies/ --recursive"
echo ""
echo "📄 Complete guide: docs/S3_IMAGE_STORAGE_SETUP.md"
