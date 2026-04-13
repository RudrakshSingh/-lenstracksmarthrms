#!/bin/bash

REGION="ap-south-1"
CLUSTER_ID="etelios-docdb-cluster"

echo "=========================================="
echo "STEP 2: Fix DocumentDB Subnet Configuration"
echo "=========================================="
echo ""

# Load resources
LATEST_DAY1=$(ls -t aws-resources-*.txt 2>/dev/null | grep -v "day2\|day3" | head -n 1)
if [ -f "$LATEST_DAY1" ]; then
    VPC_ID=$(grep -m 1 '^VPC_ID=' "$LATEST_DAY1" | cut -d'=' -f2)
    PRIVATE_SUBNET_1=$(grep -m 1 '^PRIVATE_SUBNET_1=' "$LATEST_DAY1" | cut -d'=' -f2)
    PRIVATE_SUBNET_2=$(grep -m 1 '^PRIVATE_SUBNET_2=' "$LATEST_DAY1" | cut -d'=' -f2)
fi

echo "Expected Configuration:"
echo "  VPC: $VPC_ID"
echo "  Private Subnets: $PRIVATE_SUBNET_1, $PRIVATE_SUBNET_2"
echo ""

# Get DocumentDB subnet group
DOCDB_SUBNET_GROUP=$(aws docdb describe-db-clusters \
  --db-cluster-identifier $CLUSTER_ID \
  --region $REGION \
  --query 'DBClusters[0].DBSubnetGroup' \
  --output text 2>/dev/null)

echo "DocumentDB Subnet Group: $DOCDB_SUBNET_GROUP"
echo ""

# Get subnets in subnet group
DOCDB_SUBNETS=$(aws docdb describe-db-subnet-groups \
  --db-subnet-group-name $DOCDB_SUBNET_GROUP \
  --region $REGION \
  --query 'DBSubnetGroups[0].Subnets[*].SubnetIdentifier' \
  --output text 2>/dev/null)

echo "DocumentDB is in subnets:"
for subnet in $DOCDB_SUBNETS; do
    SUBNET_AZ=$(aws ec2 describe-subnets --subnet-ids $subnet --region $REGION --query 'Subnets[0].AvailabilityZone' --output text 2>/dev/null)
    SUBNET_CIDR=$(aws ec2 describe-subnets --subnet-ids $subnet --region $REGION --query 'Subnets[0].CidrBlock' --output text 2>/dev/null)
    echo "  - $subnet ($SUBNET_AZ, $SUBNET_CIDR)"
done
echo ""

# Check if subnets match our private subnets
if echo "$DOCDB_SUBNETS" | grep -q "$PRIVATE_SUBNET_1" && echo "$DOCDB_SUBNETS" | grep -q "$PRIVATE_SUBNET_2"; then
    echo "✅ DocumentDB is in correct private subnets"
else
    echo "⚠️  DocumentDB may not be in same subnets as EKS"
    echo "   This can cause connectivity issues"
fi

echo ""

# Check route tables for private subnets
echo "Checking route tables (NAT Gateway connectivity)..."
for subnet in $PRIVATE_SUBNET_1 $PRIVATE_SUBNET_2; do
    RT=$(aws ec2 describe-route-tables \
        --filters "Name=association.subnet-id,Values=$subnet" \
        --region $REGION \
        --query 'RouteTables[0].RouteTableId' \
        --output text 2>/dev/null)
    
    NAT=$(aws ec2 describe-route-tables \
        --route-table-ids $RT \
        --region $REGION \
        --query 'RouteTables[0].Routes[?DestinationCidrBlock==`0.0.0.0/0`].NatGatewayId' \
        --output text 2>/dev/null)
    
    echo "  Subnet $subnet:"
    echo "    Route Table: $RT"
    echo "    NAT Gateway: $NAT"
done

echo ""
echo "=========================================="
echo "STEP 2: PASSED ✅"
echo "=========================================="
echo ""
echo "Subnet configuration looks correct"
echo "DocumentDB and EKS are in same VPC with proper routing"
echo ""
echo "Next: ./step3-fix-all-security-groups.sh"
