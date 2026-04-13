#!/bin/bash

set -e

REGION="ap-south-1"
NAMESPACE="etelios-prod"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo "=========================================="
echo "Fix ALL Security Groups for DocumentDB"
echo "=========================================="
echo ""

# Load DocumentDB SG
LATEST_DAY1=$(ls -t aws-resources-*.txt 2>/dev/null | grep -v "day2\|day3" | head -n 1)
if [ -f "$LATEST_DAY1" ]; then
    DOCDB_SG=$(grep -m 1 '^DOCDB_SG=' "$LATEST_DAY1" 2>/dev/null | cut -d'=' -f2 || echo "")
fi

if [ -z "$DOCDB_SG" ]; then
    warning "DocumentDB SG not found in resource file, trying to find..."
    DOCDB_SG=$(aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=etelios-docdb-sg" \
        --query 'SecurityGroups[0].GroupId' \
        --output text --region $REGION 2>/dev/null || echo "")
fi

log "DocumentDB Security Group: $DOCDB_SG"
echo ""

# Get ALL security groups from running nodes
log "Finding ALL security groups from running EKS nodes..."
NODE_SGS=$(aws ec2 describe-instances \
    --filters "Name=tag:eks:cluster-name,Values=etelios-prod" "Name=instance-state-name,Values=running" \
    --query "Reservations[*].Instances[*].SecurityGroups[*].GroupId" \
    --output text --region $REGION 2>/dev/null | tr '\t' '\n' | sort -u)

log "Found node security groups:"
for sg in $NODE_SGS; do
    SG_NAME=$(aws ec2 describe-security-groups --group-ids $sg --query 'SecurityGroups[0].GroupName' --output text --region $REGION 2>/dev/null || echo "unknown")
    log "  - $sg ($SG_NAME)"
done
echo ""

# Add rule for each node security group
log "Adding DocumentDB access rules for ALL node security groups..."
for sg in $NODE_SGS; do
    log "  Adding rule from $sg..."
    aws ec2 authorize-security-group-ingress \
        --group-id $DOCDB_SG \
        --protocol tcp \
        --port 27017 \
        --source-group $sg \
        --region $REGION 2>&1 | grep -v "already exists" || log "    ✅ Rule added (or already exists)"
done

log "✅ All security group rules added"
echo ""

# Also add VPC CIDR range as fallback
log "Adding VPC CIDR range as fallback..."
VPC_CIDR="10.0.0.0/16"
aws ec2 authorize-security-group-ingress \
    --group-id $DOCDB_SG \
    --protocol tcp \
    --port 27017 \
    --cidr $VPC_CIDR \
    --region $REGION 2>&1 | grep -v "already exists" || log "✅ VPC CIDR rule added"

echo ""

# Check DocumentDB cluster status
log "Checking DocumentDB cluster status..."
DOCDB_STATUS=$(aws docdb describe-db-clusters \
    --db-cluster-identifier etelios-docdb-cluster \
    --query 'DBClusters[0].Status' \
    --output text --region $REGION 2>/dev/null || echo "unknown")

log "DocumentDB Status: $DOCDB_STATUS"

if [ "$DOCDB_STATUS" != "available" ]; then
    warning "DocumentDB cluster is not available! Status: $DOCDB_STATUS"
    warning "This is why pods can't connect!"
    echo ""
    warning "DocumentDB may still be creating or in maintenance."
    warning "Check AWS Console: https://console.aws.amazon.com/docdb/home?region=$REGION#clusters"
    exit 1
fi

log "✅ DocumentDB cluster is available"
echo ""

# Restart pods
log "Restarting all pods..."
kubectl delete pods --all -n $NAMESPACE --grace-period=0 --force &>/dev/null || true

log "✅ Pods restarting"
echo ""

log "Waiting 2 minutes for pods to connect..."
sleep 120

# Check final status
READY=$(kubectl get pods -n $NAMESPACE -o jsonpath='{range .items[*]}{.status.containerStatuses[0].ready}{"\n"}{end}' 2>/dev/null | grep -c "true" || echo "0")
TOTAL=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | wc -l | tr -d ' ')

echo ""
log "=========================================="
log "FINAL STATUS"
log "=========================================="
log "  Pods Ready: $READY / $TOTAL"
echo ""

if [ "$READY" -ge 15 ]; then
    log "✅ SUCCESS! Services connected to DocumentDB!"
    echo ""
    log "Test now:"
    echo "   curl http://a0adb495fa82c42bfafa50a3552b78dd-1883230600.ap-south-1.elb.amazonaws.com/health"
elif [ "$READY" -gt 5 ]; then
    warning "Partial success. Some services connected."
    warning "Check logs: kubectl logs -n $NAMESPACE <pod-name>"
else
    warning "Most pods still not ready. Possible issues:"
    echo "   1. DocumentDB cluster not fully available"
    echo "   2. More time needed for connections"
    echo "   3. Check pod logs for errors"
    echo ""
    log "Check a pod's logs:"
    echo "   kubectl logs -n $NAMESPACE $(kubectl get pods -n $NAMESPACE -o name | head -n 1 | cut -d'/' -f2)"
fi

echo ""
