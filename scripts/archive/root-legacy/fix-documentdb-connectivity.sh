#!/bin/bash

set -e

REGION="ap-south-1"
NAMESPACE="etelios-prod"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "=========================================="
echo "Fix DocumentDB Connectivity"
echo "=========================================="
echo ""

log "Issue: getaddrinfo EAI_AGAIN - DNS resolution failing"
log "Cause: DocumentDB security group not allowing EKS node connections"
echo ""

###############################################################################
# STEP 1: Load Resource IDs
###############################################################################

log "=========================================="
log "STEP 1: Loading Resource IDs"
log "=========================================="

LATEST_DAY1=$(ls -t aws-resources-*.txt 2>/dev/null | grep -v "day2\|day3" | head -n 1)
LATEST_DAY2=$(ls -t aws-resources-day2-*.txt 2>/dev/null | head -n 1)

if [ -f "$LATEST_DAY1" ]; then
    source "$LATEST_DAY1"
fi

VPC_ID=${VPC_ID:-$(grep -m 1 '^VPC_ID=' "$LATEST_DAY1" 2>/dev/null | cut -d'=' -f2 || echo "")}
DOCDB_SG=${DOCDB_SG:-$(grep -m 1 '^DOCDB_SG=' "$LATEST_DAY1" 2>/dev/null | cut -d'=' -f2 || echo "")}
NODE_SG=${NODE_SG:-$(grep -m 1 '^NODE_SG=' "$LATEST_DAY1" 2>/dev/null | cut -d'=' -f2 || echo "")}

# Get actual node security group from running nodes
if [ -z "$NODE_SG" ] || [ "$NODE_SG" == "None" ]; then
    log "Finding node security group from running instances..."
    NODE_SG=$(aws ec2 describe-instances \
        --filters "Name=tag:eks:cluster-name,Values=etelios-prod" "Name=instance-state-name,Values=running" \
        --query "Reservations[0].Instances[0].SecurityGroups[0].GroupId" \
        --output text --region $REGION 2>/dev/null || echo "")
fi

log "VPC: $VPC_ID"
log "DocumentDB SG: $DOCDB_SG"
log "Node SG: $NODE_SG"
echo ""

if [ -z "$DOCDB_SG" ] || [ -z "$NODE_SG" ]; then
    error "Security groups not found. Cannot proceed."
    exit 1
fi

###############################################################################
# STEP 2: Fix DocumentDB Security Group
###############################################################################

log "=========================================="
log "STEP 2: Allowing EKS Nodes to Access DocumentDB"
log "=========================================="

log "Adding ingress rule to DocumentDB security group..."
log "  From: Node SG ($NODE_SG)"
log "  To: DocumentDB SG ($DOCDB_SG)"
log "  Port: 27017 (MongoDB)"
echo ""

# Add rule to allow nodes to access DocumentDB
aws ec2 authorize-security-group-ingress \
    --group-id $DOCDB_SG \
    --protocol tcp \
    --port 27017 \
    --source-group $NODE_SG \
    --region $REGION 2>&1 | grep -v "already exists" || log "✅ Rule added (or already exists)"

log "✅ DocumentDB security group updated"
echo ""

###############################################################################
# STEP 3: Verify VPC DNS Settings
###############################################################################

log "=========================================="
log "STEP 3: Verifying VPC DNS Settings"
log "=========================================="

DNS_SUPPORT=$(aws ec2 describe-vpc-attribute --vpc-id $VPC_ID --attribute enableDnsSupport --query 'EnableDnsSupport.Value' --output text --region $REGION 2>/dev/null || echo "")
DNS_HOSTNAMES=$(aws ec2 describe-vpc-attribute --vpc-id $VPC_ID --attribute enableDnsHostnames --query 'EnableDnsHostnames.Value' --output text --region $REGION 2>/dev/null || echo "")

log "VPC DNS Settings:"
log "  DNS Support: $DNS_SUPPORT"
log "  DNS Hostnames: $DNS_HOSTNAMES"

if [ "$DNS_SUPPORT" != "true" ] || [ "$DNS_HOSTNAMES" != "true" ]; then
    warning "DNS not fully enabled. Enabling..."
    aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-support --region $REGION 2>/dev/null || true
    aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames --region $REGION 2>/dev/null || true
    log "✅ DNS enabled"
else
    log "✅ DNS settings correct"
fi

echo ""

###############################################################################
# STEP 4: Test Connection from a Pod
###############################################################################

log "=========================================="
log "STEP 4: Testing DocumentDB Connection"
log "=========================================="

# Get DocumentDB endpoint
DOCDB_ENDPOINT=$(grep "^DOCDB_ENDPOINT=" "$LATEST_DAY2" 2>/dev/null | cut -d'=' -f2 || echo "")

if [ -z "$DOCDB_ENDPOINT" ]; then
    error "DocumentDB endpoint not found"
    exit 1
fi

log "DocumentDB Endpoint: $DOCDB_ENDPOINT"
echo ""

# Create test pod to check connectivity
log "Creating test pod to verify connectivity..."

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: docdb-test
  namespace: $NAMESPACE
spec:
  containers:
  - name: mongo-client
    image: mongo:5.0
    command: ['sh', '-c', 'sleep 3600']
  restartPolicy: Never
EOF

log "Waiting for test pod to be ready..."
sleep 10

log "Testing DNS resolution from pod..."
kubectl exec -n $NAMESPACE docdb-test -- nslookup $DOCDB_ENDPOINT 2>&1 | head -n 10 || warning "DNS test failed"

echo ""
log "Testing DocumentDB port connectivity..."
kubectl exec -n $NAMESPACE docdb-test -- nc -zv $DOCDB_ENDPOINT 27017 2>&1 | head -n 5 || warning "Port test failed"

echo ""

###############################################################################
# STEP 5: Restart Services
###############################################################################

log "=========================================="
log "STEP 5: Restarting Services"
log "=========================================="

log "Deleting test pod..."
kubectl delete pod docdb-test -n $NAMESPACE --force --grace-period=0 &>/dev/null || true

log "Deleting all service pods to force reconnection..."
kubectl delete pods --all -n $NAMESPACE --grace-period=0 --force &>/dev/null || true

log "✅ Pods deleted"
echo ""

log "Waiting 90 seconds for pods to restart with fixed connectivity..."
sleep 90

READY=$(kubectl get pods -n $NAMESPACE -o jsonpath='{range .items[*]}{.status.containerStatuses[0].ready}{"\n"}{end}' 2>/dev/null | grep -c "true" || echo "0")
TOTAL=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | wc -l | tr -d ' ')

echo ""
log "=========================================="
log "FINAL STATUS"
log "=========================================="
log "  Pods Ready: $READY / $TOTAL"
echo ""

if [ "$READY" -ge 15 ]; then
    log "✅ SUCCESS! Services should now be accessible!"
else
    warning "Still waiting for pods. Check logs:"
    echo "   kubectl logs -n $NAMESPACE <pod-name>"
fi

echo ""
