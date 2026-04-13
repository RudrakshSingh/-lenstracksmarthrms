#!/bin/bash

REGION="ap-south-1"
CLUSTER_ID="etelios-docdb-cluster"

echo "=========================================="
echo "STEP 1: Verify DocumentDB Cluster"
echo "=========================================="
echo ""

echo "Checking DocumentDB cluster status..."
echo ""

# Get cluster details
CLUSTER_INFO=$(aws docdb describe-db-clusters \
  --db-cluster-identifier $CLUSTER_ID \
  --region $REGION \
  --query 'DBClusters[0]' \
  --output json 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "❌ Cannot access DocumentDB cluster"
    echo "   Check AWS permissions or cluster name"
    exit 1
fi

STATUS=$(echo $CLUSTER_INFO | jq -r '.Status')
ENDPOINT=$(echo $CLUSTER_INFO | jq -r '.Endpoint')
PORT=$(echo $CLUSTER_INFO | jq -r '.Port')
SUBNET_GROUP=$(echo $CLUSTER_INFO | jq -r '.DBSubnetGroup')
VPC_SG=$(echo $CLUSTER_INFO | jq -r '.VpcSecurityGroups[0].VpcSecurityGroupId')

echo "📊 Cluster Information:"
echo "  Status: $STATUS"
echo "  Endpoint: $ENDPOINT"
echo "  Port: $PORT"
echo "  Subnet Group: $SUBNET_GROUP"
echo "  Security Group: $VPC_SG"
echo ""

if [ "$STATUS" != "available" ]; then
    echo "❌ Cluster NOT available!"
    echo "   Current status: $STATUS"
    echo ""
    echo "   Possible states:"
    echo "   - creating: Wait 15-20 minutes"
    echo "   - modifying: Wait 5-10 minutes"
    echo "   - backing-up: Wait for backup to complete"
    echo ""
    echo "   Check console: https://console.aws.amazon.com/docdb/home?region=$REGION"
    exit 1
fi

echo "✅ DocumentDB cluster is available"
echo ""

# Check instances
echo "Checking DocumentDB instances..."
INSTANCES=$(aws docdb describe-db-instances \
  --filters "Name=db-cluster-id,Values=$CLUSTER_ID" \
  --region $REGION \
  --query 'DBInstances[*].[DBInstanceIdentifier,DBInstanceStatus]' \
  --output table 2>/dev/null)

echo "$INSTANCES"
echo ""

# Verify endpoint is resolvable
echo "Testing DNS resolution of endpoint..."
if nslookup $ENDPOINT &>/dev/null; then
    echo "✅ Endpoint DNS resolves"
else
    echo "⚠️  Endpoint DNS not resolving from your machine"
    echo "   This is OK if it resolves from pods"
fi

echo ""
echo "=========================================="
echo "STEP 1: PASSED ✅"
echo "=========================================="
echo ""
echo "DocumentDB cluster is available and ready for connections"
echo ""
echo "Next: ./step2-fix-subnets.sh"
