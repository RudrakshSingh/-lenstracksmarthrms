#!/bin/bash

# Fix S3 IAM Permissions for EKS Node Group
# This script creates and attaches IAM policy for S3 access

set -e

echo "=== 🔧 S3 IAM Permissions Setup ==="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if aws cli is available
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install AWS CLI first.${NC}"
    exit 1
fi

# Policy name
POLICY_NAME="EteliosS3AccessPolicy"
BUCKET_NAME="etelios-prod-storage"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "383234048604")

echo "1️⃣  Creating IAM Policy for S3 Access..."
echo ""

# Create policy document
cat > /tmp/s3-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::${BUCKET_NAME}",
        "arn:aws:s3:::${BUCKET_NAME}/*"
      ]
    }
  ]
}
EOF

echo "Policy Document:"
cat /tmp/s3-policy.json
echo ""

# Check if policy already exists
EXISTING_POLICY=$(aws iam list-policies --query "Policies[?PolicyName=='${POLICY_NAME}'].Arn" --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_POLICY" ] && [ "$EXISTING_POLICY" != "None" ]; then
    echo -e "${YELLOW}⚠️  Policy already exists: $EXISTING_POLICY${NC}"
    POLICY_ARN="$EXISTING_POLICY"
else
    echo "Creating new policy..."
    POLICY_ARN=$(aws iam create-policy \
        --policy-name "$POLICY_NAME" \
        --policy-document file:///tmp/s3-policy.json \
        --query 'Policy.Arn' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$POLICY_ARN" ] && [ "$POLICY_ARN" != "None" ]; then
        echo -e "${GREEN}✅ Policy created: $POLICY_ARN${NC}"
    else
        echo -e "${RED}❌ Failed to create policy${NC}"
        exit 1
    fi
fi

echo ""
echo "2️⃣  Finding EKS Node Group IAM Role..."
echo ""

# Get cluster name
CLUSTER_NAME=$(aws eks list-clusters --query 'clusters[0]' --output text 2>/dev/null || echo "etelios-prod")

echo "Cluster: $CLUSTER_NAME"
echo ""

# Get node groups
NODE_GROUPS=$(aws eks list-nodegroups --cluster-name "$CLUSTER_NAME" --query 'nodegroups[]' --output text 2>/dev/null || echo "")

if [ -z "$NODE_GROUPS" ] || [ "$NODE_GROUPS" = "None" ]; then
    echo -e "${RED}❌ No node groups found${NC}"
    exit 1
fi

echo "Node Groups:"
echo "$NODE_GROUPS"
echo ""

# Get IAM role for first node group
NODE_GROUP=$(echo "$NODE_GROUPS" | head -1)
NODE_ROLE=$(aws eks describe-nodegroup \
    --cluster-name "$CLUSTER_NAME" \
    --nodegroup-name "$NODE_GROUP" \
    --query 'nodegroup.nodeRole' \
    --output text 2>/dev/null || echo "")

if [ -z "$NODE_ROLE" ] || [ "$NODE_ROLE" = "None" ]; then
    echo -e "${RED}❌ Failed to get node group role${NC}"
    exit 1
fi

ROLE_NAME=$(echo "$NODE_ROLE" | awk -F'/' '{print $NF}')
echo -e "${GREEN}✅ Node Group Role: $ROLE_NAME${NC}"
echo "   ARN: $NODE_ROLE"
echo ""

echo "3️⃣  Attaching Policy to Node Group Role..."
echo ""

# Check if policy is already attached
ATTACHED_POLICIES=$(aws iam list-attached-role-policies \
    --role-name "$ROLE_NAME" \
    --query "AttachedPolicies[?PolicyArn=='${POLICY_ARN}'].PolicyArn" \
    --output text 2>/dev/null || echo "")

if [ -n "$ATTACHED_POLICIES" ] && [ "$ATTACHED_POLICIES" != "None" ]; then
    echo -e "${YELLOW}⚠️  Policy already attached to role${NC}"
else
    aws iam attach-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-arn "$POLICY_ARN" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Policy attached successfully${NC}"
    else
        echo -e "${RED}❌ Failed to attach policy${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}✅ S3 IAM Permissions Setup Complete!${NC}"
echo ""
echo "📝 Next Steps:"
echo "   1. Restart pods to pick up new permissions:"
echo "      kubectl rollout restart deployment/hr-service -n etelios-prod"
echo "      kubectl rollout restart deployment/attendance-service -n etelios-prod"
echo ""
echo "   2. Wait 30 seconds and check S3 initialization:"
echo "      kubectl logs -n etelios-prod -l app=hr-service --tail=50 | grep -i s3"
echo "      kubectl logs -n etelios-prod -l app=attendance-service --tail=50 | grep -i s3"
echo ""
echo "   3. Test S3 upload again"

# Cleanup
rm -f /tmp/s3-policy.json
