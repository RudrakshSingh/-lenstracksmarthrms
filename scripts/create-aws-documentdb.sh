#!/bin/bash

# ============================================
# AWS DocumentDB Cluster Creation Script
# ============================================
# This script creates a complete AWS DocumentDB setup:
# 1. VPC and Subnet Group
# 2. Security Group
# 3. DocumentDB Cluster
# 4. DocumentDB Instance
# 5. Connection details
#
# Usage:
#   ./scripts/create-aws-documentdb.sh
#   AWS_REGION=ap-south-1 ./scripts/create-aws-documentdb.sh
#
# Requirements:
#   - AWS CLI configured
#   - Appropriate IAM permissions
#   - VPC with private subnets
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGION="${AWS_REGION:-ap-south-1}"
CLUSTER_ID="${DOCDB_CLUSTER_ID:-lenstrack-docdb-cluster}"
INSTANCE_ID="${DOCDB_INSTANCE_ID:-lenstrack-docdb-instance-1}"
INSTANCE_CLASS="${DOCDB_INSTANCE_CLASS:-db.r6g.large}"
ENGINE_VERSION="${DOCDB_ENGINE_VERSION:-5.0.0}"
MASTER_USER="${DOCDB_MASTER_USER:-docdbadmin}"
MASTER_PASSWORD="${DOCDB_MASTER_PASSWORD:-$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)}"
SUBNET_GROUP_NAME="${DOCDB_SUBNET_GROUP:-lenstrack-docdb-subnet-group}"
SECURITY_GROUP_NAME="${DOCDB_SG_NAME:-lenstrack-docdb-sg}"
BACKUP_RETENTION="${DOCDB_BACKUP_RETENTION:-7}"
BACKUP_WINDOW="${DOCDB_BACKUP_WINDOW:-03:00-04:00}"
MAINTENANCE_WINDOW="${DOCDB_MAINTENANCE_WINDOW:-mon:04:00-mon:05:00}"

# Logging functions
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

step() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    error "AWS CLI not found. Please install AWS CLI first."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    error "AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
log "AWS Account ID: $AWS_ACCOUNT_ID"
log "Region: $REGION"

# ============================================
# STEP 1: Get VPC and Subnets
# ============================================

step "STEP 1: Finding VPC and Subnets"

# Try to find existing VPC (prefer default VPC or EKS VPC)
VPC_ID=$(aws ec2 describe-vpcs \
    --region $REGION \
    --filters "Name=isDefault,Values=true" \
    --query 'Vpcs[0].VpcId' \
    --output text 2>/dev/null)

if [ "$VPC_ID" == "None" ] || [ -z "$VPC_ID" ]; then
    # Try to find VPC with EKS cluster
    VPC_ID=$(aws eks list-clusters --region $REGION --query 'clusters[0]' --output text 2>/dev/null)
    if [ -n "$VPC_ID" ]; then
        CLUSTER_NAME=$VPC_ID
        VPC_ID=$(aws eks describe-cluster \
            --name $CLUSTER_NAME \
            --region $REGION \
            --query 'resourcesVpcConfig.vpcId' \
            --output text 2>/dev/null)
    fi
fi

if [ "$VPC_ID" == "None" ] || [ -z "$VPC_ID" ]; then
    # List all VPCs and let user choose
    warning "No default VPC found. Listing available VPCs:"
    aws ec2 describe-vpcs --region $REGION --query 'Vpcs[*].[VpcId,CidrBlock,Tags[?Key==`Name`].Value|[0]]' --output table
    read -p "Enter VPC ID: " VPC_ID
fi

log "Using VPC: $VPC_ID"

# Get subnets in the VPC (prefer private subnets)
SUBNETS=$(aws ec2 describe-subnets \
    --region $REGION \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'Subnets[*].[SubnetId,AvailabilityZone,CidrBlock]' \
    --output text | head -2)

if [ -z "$SUBNETS" ]; then
    error "No subnets found in VPC $VPC_ID"
    exit 1
fi

# Extract subnet IDs (at least 2 for high availability)
SUBNET_IDS=$(echo "$SUBNETS" | awk '{print $1}' | tr '\n' ' ' | xargs)
SUBNET_COUNT=$(echo "$SUBNET_IDS" | wc -w | xargs)

if [ "$SUBNET_COUNT" -lt 2 ]; then
    warning "Only $SUBNET_COUNT subnet(s) found. DocumentDB requires at least 2 subnets in different AZs."
    log "Subnets: $SUBNET_IDS"
else
    log "Found $SUBNET_COUNT subnets: $SUBNET_IDS"
fi

# ============================================
# STEP 2: Create Subnet Group
# ============================================

step "STEP 2: Creating DocumentDB Subnet Group"

if aws docdb describe-db-subnet-groups \
    --db-subnet-group-name $SUBNET_GROUP_NAME \
    --region $REGION &>/dev/null; then
    log "Subnet group '$SUBNET_GROUP_NAME' already exists"
else
    log "Creating subnet group '$SUBNET_GROUP_NAME'..."
    
    aws docdb create-db-subnet-group \
        --db-subnet-group-name $SUBNET_GROUP_NAME \
        --db-subnet-group-description "Lenstrack DocumentDB subnet group" \
        --subnet-ids $SUBNET_IDS \
        --tags "Key=Name,Value=$SUBNET_GROUP_NAME" "Key=Project,Value=Lenstrack" \
        --region $REGION
    
    log "✅ Subnet group created"
fi

# ============================================
# STEP 3: Create Security Group
# ============================================

step "STEP 3: Creating Security Group"

# Check if security group exists
SG_ID=$(aws ec2 describe-security-groups \
    --region $REGION \
    --filters "Name=group-name,Values=$SECURITY_GROUP_NAME" "Name=vpc-id,Values=$VPC_ID" \
    --query 'SecurityGroups[0].GroupId' \
    --output text 2>/dev/null)

if [ "$SG_ID" != "None" ] && [ -n "$SG_ID" ]; then
    log "Security group '$SECURITY_GROUP_NAME' already exists: $SG_ID"
else
    log "Creating security group '$SECURITY_GROUP_NAME'..."
    
    SG_ID=$(aws ec2 create-security-group \
        --group-name $SECURITY_GROUP_NAME \
        --description "Security group for Lenstrack DocumentDB cluster" \
        --vpc-id $VPC_ID \
        --region $REGION \
        --query 'GroupId' \
        --output text)
    
    log "✅ Security group created: $SG_ID"
fi

# Add ingress rule for VPC CIDR (allow access from within VPC)
VPC_CIDR=$(aws ec2 describe-vpcs \
    --vpc-ids $VPC_ID \
    --region $REGION \
    --query 'Vpcs[0].CidrBlock' \
    --output text)

log "Adding ingress rule for VPC CIDR: $VPC_CIDR"

# Check if rule already exists
EXISTING_RULE=$(aws ec2 describe-security-groups \
    --group-ids $SG_ID \
    --region $REGION \
    --query "SecurityGroups[0].IpPermissions[?FromPort==\`27017\` && IpRanges[?CidrIp==\`$VPC_CIDR\`]]" \
    --output text 2>/dev/null)

if [ -z "$EXISTING_RULE" ]; then
    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 27017 \
        --cidr $VPC_CIDR \
        --region $REGION &>/dev/null || true
    
    log "✅ Added ingress rule for VPC CIDR"
else
    log "Ingress rule already exists"
fi

# If EKS cluster exists, add EKS node security groups
EKS_CLUSTERS=$(aws eks list-clusters --region $REGION --query 'clusters' --output text 2>/dev/null)
if [ -n "$EKS_CLUSTERS" ]; then
    log "EKS cluster(s) found. Adding EKS node security groups..."
    
    for CLUSTER_NAME in $EKS_CLUSTERS; do
        log "Processing EKS cluster: $CLUSTER_NAME"
        
        # Get node groups
        NODE_GROUPS=$(aws eks list-nodegroups \
            --cluster-name $CLUSTER_NAME \
            --region $REGION \
            --query 'nodegroups' \
            --output text 2>/dev/null)
        
        for NODE_GROUP in $NODE_GROUPS; do
            # Get node group security group
            NODE_SG=$(aws eks describe-nodegroup \
                --cluster-name $CLUSTER_NAME \
                --nodegroup-name $NODE_GROUP \
                --region $REGION \
                --query 'nodegroup.resources.remoteAccessSecurityGroup' \
                --output text 2>/dev/null)
            
            if [ "$NODE_SG" != "None" ] && [ -n "$NODE_SG" ]; then
                log "Adding EKS node security group: $NODE_SG"
                
                aws ec2 authorize-security-group-ingress \
                    --group-id $SG_ID \
                    --protocol tcp \
                    --port 27017 \
                    --source-group $NODE_SG \
                    --region $REGION &>/dev/null || true
            fi
        done
    done
fi

# ============================================
# STEP 4: Create DocumentDB Cluster
# ============================================

step "STEP 4: Creating DocumentDB Cluster"

if aws docdb describe-db-clusters \
    --db-cluster-identifier $CLUSTER_ID \
    --region $REGION &>/dev/null; then
    warning "Cluster '$CLUSTER_ID' already exists"
    
    CLUSTER_STATUS=$(aws docdb describe-db-clusters \
        --db-cluster-identifier $CLUSTER_ID \
        --region $REGION \
        --query 'DBClusters[0].Status' \
        --output text)
    
    log "Cluster status: $CLUSTER_STATUS"
    
    if [ "$CLUSTER_STATUS" == "available" ]; then
        CLUSTER_ENDPOINT=$(aws docdb describe-db-clusters \
            --db-cluster-identifier $CLUSTER_ID \
            --region $REGION \
            --query 'DBClusters[0].Endpoint' \
            --output text)
        log "Cluster endpoint: $CLUSTER_ENDPOINT"
    fi
else
    log "Creating DocumentDB cluster '$CLUSTER_ID'..."
    log "This will take 10-15 minutes..."
    
    aws docdb create-db-cluster \
        --db-cluster-identifier $CLUSTER_ID \
        --engine docdb \
        --engine-version $ENGINE_VERSION \
        --master-username $MASTER_USER \
        --master-user-password $MASTER_PASSWORD \
        --db-subnet-group-name $SUBNET_GROUP_NAME \
        --vpc-security-group-ids $SG_ID \
        --backup-retention-period $BACKUP_RETENTION \
        --preferred-backup-window "$BACKUP_WINDOW" \
        --preferred-maintenance-window "$MAINTENANCE_WINDOW" \
        --storage-encrypted \
        --tags "Key=Name,Value=$CLUSTER_ID" "Key=Project,Value=Lenstrack" \
        --region $REGION
    
    log "✅ Cluster creation initiated"
    log "Waiting for cluster to be available (this takes 10-15 minutes)..."
    
    # Wait for cluster to be available (poll manually since wait command may not work)
    log "Polling cluster status..."
    while true; do
        CLUSTER_STATUS=$(aws docdb describe-db-clusters \
            --db-cluster-identifier $CLUSTER_ID \
            --region $REGION \
            --query 'DBClusters[0].Status' \
            --output text 2>/dev/null)
        
        if [ "$CLUSTER_STATUS" == "available" ]; then
            break
        elif [ "$CLUSTER_STATUS" == "failed" ] || [ "$CLUSTER_STATUS" == "deleting" ]; then
            error "Cluster creation failed or is being deleted. Status: $CLUSTER_STATUS"
            exit 1
        fi
        
        log "Cluster status: $CLUSTER_STATUS (waiting...)"
        sleep 30
    done
    
    log "✅ Cluster is now available!"
    
    CLUSTER_ENDPOINT=$(aws docdb describe-db-clusters \
        --db-cluster-identifier $CLUSTER_ID \
        --region $REGION \
        --query 'DBClusters[0].Endpoint' \
        --output text)
    
    log "Cluster endpoint: $CLUSTER_ENDPOINT"
fi

# ============================================
# STEP 5: Create DocumentDB Instance
# ============================================

step "STEP 5: Creating DocumentDB Instance"

if aws docdb describe-db-instances \
    --db-instance-identifier $INSTANCE_ID \
    --region $REGION &>/dev/null; then
    warning "Instance '$INSTANCE_ID' already exists"
    
    INSTANCE_STATUS=$(aws docdb describe-db-instances \
        --db-instance-identifier $INSTANCE_ID \
        --region $REGION \
        --query 'DBInstances[0].DBInstanceStatus' \
        --output text)
    
    log "Instance status: $INSTANCE_STATUS"
else
    log "Creating DocumentDB instance '$INSTANCE_ID'..."
    log "Instance class: $INSTANCE_CLASS"
    log "This will take 5-10 minutes..."
    
    # Get first availability zone from subnets
    FIRST_AZ=$(echo "$SUBNETS" | head -1 | awk '{print $2}')
    
    aws docdb create-db-instance \
        --db-instance-identifier $INSTANCE_ID \
        --db-instance-class $INSTANCE_CLASS \
        --engine docdb \
        --db-cluster-identifier $CLUSTER_ID \
        --availability-zone $FIRST_AZ \
        --tags "Key=Name,Value=$INSTANCE_ID" "Key=Project,Value=Lenstrack" \
        --region $REGION
    
    log "✅ Instance creation initiated"
    log "Waiting for instance to be available (this takes 5-10 minutes)..."
    
    # Wait for instance to be available (poll manually)
    log "Polling instance status..."
    while true; do
        INSTANCE_STATUS=$(aws docdb describe-db-instances \
            --db-instance-identifier $INSTANCE_ID \
            --region $REGION \
            --query 'DBInstances[0].DBInstanceStatus' \
            --output text 2>/dev/null)
        
        if [ "$INSTANCE_STATUS" == "available" ]; then
            break
        elif [ "$INSTANCE_STATUS" == "failed" ] || [ "$INSTANCE_STATUS" == "deleting" ]; then
            error "Instance creation failed or is being deleted. Status: $INSTANCE_STATUS"
            exit 1
        fi
        
        log "Instance status: $INSTANCE_STATUS (waiting...)"
        sleep 30
    done
    
    log "✅ Instance is now available!"
fi

# ============================================
# STEP 6: Get Connection Details
# ============================================

step "STEP 6: Connection Details"

# Get cluster endpoint
CLUSTER_ENDPOINT=$(aws docdb describe-db-clusters \
    --db-cluster-identifier $CLUSTER_ID \
    --region $REGION \
    --query 'DBClusters[0].Endpoint' \
    --output text)

CLUSTER_PORT=$(aws docdb describe-db-clusters \
    --db-cluster-identifier $CLUSTER_ID \
    --region $REGION \
    --query 'DBClusters[0].Port' \
    --output text)

CLUSTER_READER_ENDPOINT=$(aws docdb describe-db-clusters \
    --db-cluster-identifier $CLUSTER_ID \
    --region $REGION \
    --query 'DBClusters[0].ReaderEndpoint' \
    --output text)

# Connection string
DOCDB_TLS_CA_FILE="${DOCDB_TLS_CA_FILE:-/etc/ssl/certs/ca-cert.pem}"
CONNECTION_STRING="mongodb://${MASTER_USER}:${MASTER_PASSWORD}@${CLUSTER_ENDPOINT}:${CLUSTER_PORT}/hrms?tls=true&tlsCAFile=${DOCDB_TLS_CA_FILE}&authSource=admin&authMechanism=SCRAM-SHA-1&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"

echo ""
echo "=========================================="
echo "✅ DocumentDB Setup Complete!"
echo "=========================================="
echo ""
echo "📊 Cluster Information:"
echo "   Cluster ID: $CLUSTER_ID"
echo "   Region: $REGION"
echo "   Status: available"
echo ""
echo "🔗 Connection Details:"
echo "   Endpoint: $CLUSTER_ENDPOINT"
echo "   Reader Endpoint: $CLUSTER_READER_ENDPOINT"
echo "   Port: $CLUSTER_PORT"
echo ""
echo "🔐 Credentials:"
echo "   Username: $MASTER_USER"
echo "   Password: $MASTER_PASSWORD"
echo ""
echo "📝 Connection String:"
echo "   $CONNECTION_STRING"
echo ""
echo "🔧 Environment Variables:"
echo "   export MONGO_URI=\"$CONNECTION_STRING\""
echo "   export MONGODB_URI=\"$CONNECTION_STRING\""
echo "   export DOCDB_TLS=\"true\""
echo "   export DOCDB_TLS_CA_FILE=\"$DOCDB_TLS_CA_FILE\""
echo "   export DOCDB_ENDPOINT=\"$CLUSTER_ENDPOINT\""
echo "   export DOCDB_PORT=\"$CLUSTER_PORT\""
echo "   export DOCDB_USERNAME=\"$MASTER_USER\""
echo "   export DOCDB_PASSWORD=\"$MASTER_PASSWORD\""
echo ""
echo "⚠️  IMPORTANT:"
echo "   1. Save the password securely!"
echo "   2. Download CA certificate:"
echo "      curl -o rds-combined-ca-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem"
echo "   3. Update your application connection string"
echo "   4. Ensure security group allows access from your application"
echo ""
echo "=========================================="

# Save to file
OUTPUT_FILE="documentdb-connection-info.txt"
cat > $OUTPUT_FILE <<EOF
# DocumentDB Connection Information
# Generated: $(date)

CLUSTER_ID=$CLUSTER_ID
REGION=$REGION
ENDPOINT=$CLUSTER_ENDPOINT
READER_ENDPOINT=$CLUSTER_READER_ENDPOINT
PORT=$CLUSTER_PORT
USERNAME=$MASTER_USER
PASSWORD=$MASTER_PASSWORD

# Connection String
MONGO_URI="$CONNECTION_STRING"
MONGODB_URI="$CONNECTION_STRING"

# Environment Variables
export MONGO_URI="$CONNECTION_STRING"
export MONGODB_URI="$CONNECTION_STRING"
export DOCDB_TLS="true"
export DOCDB_TLS_CA_FILE="$DOCDB_TLS_CA_FILE"
export DOCDB_ENDPOINT="$CLUSTER_ENDPOINT"
export DOCDB_PORT="$CLUSTER_PORT"
export DOCDB_USERNAME="$MASTER_USER"
export DOCDB_PASSWORD="$MASTER_PASSWORD"
EOF

log "Connection details saved to: $OUTPUT_FILE"
log "⚠️  Keep this file secure and do not commit it to version control!"
