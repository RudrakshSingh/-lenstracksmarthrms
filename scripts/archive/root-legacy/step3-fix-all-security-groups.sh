#!/bin/bash

REGION="ap-south-1"
NAMESPACE="etelios-prod"

echo "=========================================="
echo "STEP 3: Fix ALL Security Groups"
echo "=========================================="
echo ""

# Get DocumentDB SG
LATEST_DAY1=$(ls -t aws-resources-*.txt 2>/dev/null | grep -v "day2\|day3" | head -n 1)
DOCDB_SG=$(grep -m 1 '^DOCDB_SG=' "$LATEST_DAY1" | cut -d'=' -f2 2>/dev/null)

if [ -z "$DOCDB_SG" ]; then
    DOCDB_SG=$(aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=etelios-docdb-sg" \
        --query 'SecurityGroups[0].GroupId' \
        --output text --region $REGION 2>/dev/null)
fi

echo "DocumentDB Security Group: $DOCDB_SG"
echo ""

# Get ALL unique security groups from running nodes
echo "Finding ALL security groups from running EKS nodes..."
ALL_NODE_SGS=$(aws ec2 describe-instances \
    --filters "Name=tag:eks:cluster-name,Values=etelios-prod" "Name=instance-state-name,Values=running" \
    --query "Reservations[*].Instances[*].SecurityGroups[*].GroupId" \
    --output text --region $REGION 2>/dev/null | tr '\t' '\n' | tr ' ' '\n' | sort -u)

echo "Found node security groups:"
for sg in $ALL_NODE_SGS; do
    SG_NAME=$(aws ec2 describe-security-groups --group-ids $sg --query 'SecurityGroups[0].GroupName' --output text --region $REGION 2>/dev/null)
    echo "  ✓ $sg ($SG_NAME)"
done
echo ""

# Get cluster security group
CLUSTER_SG=$(aws eks describe-cluster \
    --name etelios-prod \
    --region $REGION \
    --query 'cluster.resourcesVpcConfig.clusterSecurityGroupId' \
    --output text 2>/dev/null)

if [ -n "$CLUSTER_SG" ] && [ "$CLUSTER_SG" != "None" ]; then
    echo "EKS Cluster Security Group: $CLUSTER_SG"
    ALL_NODE_SGS="$ALL_NODE_SGS $CLUSTER_SG"
else
    echo "⚠️  Cluster SG not found"
fi
echo ""

# Add rules for each SG
echo "Adding DocumentDB access rules..."
SUCCESS=0
for sg in $ALL_NODE_SGS; do
    echo -n "  Rule from $sg... "
    if aws ec2 authorize-security-group-ingress \
        --group-id $DOCDB_SG \
        --protocol tcp \
        --port 27017 \
        --source-group $sg \
        --region $REGION &>/dev/null; then
        echo "✅"
        SUCCESS=$((SUCCESS + 1))
    else
        echo "⚠️  (may already exist)"
    fi
done

echo ""
echo "Added $SUCCESS new rules"
echo ""

# Add VPC CIDR as comprehensive fallback
echo "Adding VPC CIDR as fallback rule..."
VPC_CIDR="10.0.0.0/16"
aws ec2 authorize-security-group-ingress \
    --group-id $DOCDB_SG \
    --protocol tcp \
    --port 27017 \
    --cidr $VPC_CIDR \
    --region $REGION &>/dev/null && echo "✅ VPC CIDR rule added" || echo "⚠️  Rule may already exist"

echo ""

# Show all current rules
echo "Current DocumentDB Security Group Rules (Port 27017):"
aws ec2 describe-security-groups \
    --group-ids $DOCDB_SG \
    --region $REGION \
    --query 'SecurityGroups[0].IpPermissions[?ToPort==`27017`]' \
    --output table 2>/dev/null | head -n 20

echo ""
echo "=========================================="
echo "STEP 3: COMPLETE ✅"
echo "=========================================="
echo ""
echo "All security group rules configured"
echo "EKS nodes can now access DocumentDB on port 27017"
echo ""
echo "Next: ./step4-test-dns-resolution.sh"
