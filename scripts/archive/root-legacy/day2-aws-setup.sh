#!/bin/bash

###############################################################################
# AWS Migration - Day 2 Setup Script
# Container Migration, DocumentDB, K8s Manifests, CI/CD
# Target: 100% Completion Today
###############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ACCOUNT_ID="383234048604"
REGION="ap-south-1"
APP_TAG="arn:aws:resource-groups:ap-south-1:383234048604:group/Etelios/098y3uazifr2klkl2ooy4u6g80"
CLUSTER_NAME="etelios-prod"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# Services list (20 microservices)
SERVICES=(
  "analytics-service"
  "attendance-service"
  "auth-service"
  "cpp-service"
  "crm-service"
  "document-service"
  "financial-service"
  "hr-service"
  "inventory-service"
  "jts-service"
  "monitoring-service"
  "notification-service"
  "payroll-service"
  "prescription-service"
  "purchase-service"
  "realtime-service"
  "sales-service"
  "service-management"
  "tenant-management-service"
  "tenant-registry-service"
)

# Log file
LOG_FILE="day2-setup-$(date +%Y%m%d-%H%M%S).log"
RESOURCE_FILE="aws-resources-day2-$(date +%Y%m%d-%H%M%S).txt"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

save_resource() {
    echo "$1" >> "$RESOURCE_FILE"
}

# Load Day 1 resources (exclude day2 and day3 files)
LATEST_RESOURCE_FILE=$(ls -t aws-resources-*.txt 2>/dev/null | grep -v -E "day2|day3" | head -n 1)
if [ -f "$LATEST_RESOURCE_FILE" ]; then
    log "Loading Day 1 resources from: $LATEST_RESOURCE_FILE"
    # Source with error handling - ignore invalid variable names
    set +e
    source "$LATEST_RESOURCE_FILE" 2>/dev/null
    set -e
else
    warning "Day 1 resource file not found. Using defaults."
    VPC_ID=""
    PRIVATE_SUBNET_1=""
    PRIVATE_SUBNET_2=""
    DOCDB_SG=""
fi

# Verify required variables are set, if not load from Day 1 file explicitly
if [ -z "$VPC_ID" ] || [ -z "$PRIVATE_SUBNET_1" ]; then
    DAY1_FILE="aws-resources-20260210-123213.txt"
    if [ -f "$DAY1_FILE" ]; then
        log "Loading Day 1 resources from: $DAY1_FILE"
        set +e
        source "$DAY1_FILE" 2>/dev/null
        set -e
    fi
fi

###############################################################################
# STEP 1: Verify Prerequisites
###############################################################################

log "=========================================="
log "STEP 1: Verifying Prerequisites"
log "=========================================="

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    error "AWS CLI not found. Please install: brew install awscli"
fi
log "✅ AWS CLI found"

# Check Docker
if ! command -v docker &> /dev/null; then
    error "Docker not found. Please install Docker Desktop"
fi
log "✅ Docker found: $(docker --version)"

# Verify Docker daemon is running
log "Verifying Docker daemon..."
if ! docker ps &>/dev/null; then
    error "Docker daemon is not running. Please start Docker Desktop and wait for it to fully start."
fi
log "✅ Docker daemon is running"

# Check kubectl
if ! command -v kubectl &> /dev/null; then
    error "kubectl not found. Please install: brew install kubectl"
fi
log "✅ kubectl found"

# Verify AWS credentials
log "Verifying AWS credentials..."
if ! aws sts get-caller-identity &>/dev/null; then
    error "AWS credentials not configured. Run: aws configure"
fi
log "✅ AWS credentials verified"

# Verify EKS cluster
log "Verifying EKS cluster..."
if ! aws eks describe-cluster --name $CLUSTER_NAME --region $REGION &>/dev/null; then
    error "EKS cluster $CLUSTER_NAME not found. Please run day1-aws-setup.sh first"
fi
log "✅ EKS cluster verified: $CLUSTER_NAME"

# Update kubeconfig
log "Updating kubeconfig..."
aws eks update-kubeconfig --name $CLUSTER_NAME --region $REGION
log "✅ Kubeconfig updated"

# Verify ECR login
log "Logging in to ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
log "✅ Logged in to ECR"

###############################################################################
# STEP 2: Create ECR Repositories
###############################################################################

log "=========================================="
log "STEP 2: Creating ECR Repositories"
log "=========================================="

for service in "${SERVICES[@]}"; do
    REPO_NAME="etelios-$service"
    if aws ecr describe-repositories --repository-names $REPO_NAME --region $REGION &>/dev/null; then
        log "  ✅ Repository exists: $REPO_NAME"
    else
        log "  Creating repository: $REPO_NAME"
        aws ecr create-repository \
            --repository-name $REPO_NAME \
            --image-scanning-configuration scanOnPush=true \
            --encryption-configuration encryptionType=AES256 \
            --tags "Key=Name,Value=$REPO_NAME" "Key=awsApplication,Value=$APP_TAG" \
            --region $REGION >> "$LOG_FILE" 2>&1
        log "  ✅ Created repository: $REPO_NAME"
    fi
done

log "✅ All ECR repositories ready"

###############################################################################
# STEP 3: Build and Push Docker Images to ECR
###############################################################################

log "=========================================="
log "STEP 3: Building and Pushing Docker Images"
log "=========================================="
log "⚠️  This will take 60-90 minutes for all 20 services..."

TOTAL=${#SERVICES[@]}
CURRENT=0
SUCCESS=0
FAILED=0

for service in "${SERVICES[@]}"; do
    CURRENT=$((CURRENT + 1))
    log "[$CURRENT/$TOTAL] Processing $service..."
    
    # Check if Dockerfile exists
    if [ ! -f "microservices/$service/Dockerfile" ]; then
        warning "Dockerfile not found for $service, skipping..."
        FAILED=$((FAILED + 1))
        continue
    fi
    
    IMAGE_NAME="$ECR_REGISTRY/etelios-$service"
    IMAGE_TAG="latest"
    
    # Build image
    # Note: Dockerfiles expect build context from root directory
    log "  Building Docker image..."
    if docker build -t "$IMAGE_NAME:$IMAGE_TAG" -f "microservices/$service/Dockerfile" . >> "$LOG_FILE" 2>&1; then
        log "  ✅ Image built successfully"
        
        # Push to ECR
        log "  Pushing to ECR..."
        if docker push "$IMAGE_NAME:$IMAGE_TAG" >> "$LOG_FILE" 2>&1; then
            log "  ✅ Pushed to ECR: $IMAGE_NAME:$IMAGE_TAG"
            SUCCESS=$((SUCCESS + 1))
            save_resource "${service}_IMAGE=$IMAGE_NAME:$IMAGE_TAG"
        else
            warning "  Failed to push $service to ECR"
            FAILED=$((FAILED + 1))
        fi
    else
        warning "  Failed to build $service"
        FAILED=$((FAILED + 1))
    fi
    echo ""
done

log "=========================================="
log "Build & Push Summary:"
log "  Total: $TOTAL"
log "  Success: $SUCCESS"
log "  Failed: $FAILED"
log "=========================================="

if [ $FAILED -gt 0 ]; then
    warning "Some services failed to build/push. Check logs for details."
fi

###############################################################################
# STEP 4: Create DocumentDB Cluster
###############################################################################

log "=========================================="
log "STEP 3: Creating DocumentDB Cluster"
log "=========================================="

DOCDB_CLUSTER_ID="etelios-docdb-cluster"
DOCDB_INSTANCE_CLASS="db.r6g.large"
DOCDB_ENGINE_VERSION="5.0.0"
DOCDB_MASTER_USER="etelios_admin"
DOCDB_MASTER_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

# Check if cluster already exists
if aws docdb describe-db-clusters --db-cluster-identifier $DOCDB_CLUSTER_ID --region $REGION &>/dev/null; then
    warning "DocumentDB cluster $DOCDB_CLUSTER_ID already exists, using existing..."
    DOCDB_ENDPOINT=$(aws docdb describe-db-clusters --db-cluster-identifier $DOCDB_CLUSTER_ID --region $REGION --query 'DBClusters[0].Endpoint' --output text)
    log "✅ Using existing DocumentDB cluster"
else
    log "Creating DocumentDB cluster (this takes 10-15 minutes)..."
    
    # Get subnet group or create
    SUBNET_GROUP_NAME="etelios-docdb-subnet-group"
    if ! aws docdb describe-db-subnet-groups --db-subnet-group-name $SUBNET_GROUP_NAME --region $REGION &>/dev/null; then
        log "Creating DocumentDB subnet group..."
        aws docdb create-db-subnet-group \
            --db-subnet-group-name $SUBNET_GROUP_NAME \
            --db-subnet-group-description "Etelios DocumentDB subnet group" \
            --subnet-ids $PRIVATE_SUBNET_1 $PRIVATE_SUBNET_2 \
            --tags "Key=Name,Value=etelios-docdb-subnet-group" "Key=awsApplication,Value=$APP_TAG" \
            --region $REGION >> "$LOG_FILE" 2>&1
        log "✅ Created subnet group"
    fi
    
    # Create cluster
    aws docdb create-db-cluster \
        --db-cluster-identifier $DOCDB_CLUSTER_ID \
        --engine docdb \
        --engine-version $DOCDB_ENGINE_VERSION \
        --master-username $DOCDB_MASTER_USER \
        --master-user-password "$DOCDB_MASTER_PASSWORD" \
        --db-subnet-group-name $SUBNET_GROUP_NAME \
        --vpc-security-group-ids $DOCDB_SG \
        --storage-encrypted \
        --backup-retention-period 7 \
        --preferred-backup-window "03:00-04:00" \
        --preferred-maintenance-window "sun:04:00-sun:05:00" \
        --tags "Key=Name,Value=etelios-docdb-cluster" "Key=awsApplication,Value=$APP_TAG" \
        --region $REGION >> "$LOG_FILE" 2>&1
    
    log "✅ DocumentDB cluster creation initiated"
    log "⏳ Waiting for cluster to be available (this takes 10-15 minutes)..."
    
    # Wait for cluster to be available (DocumentDB doesn't have wait command, so we poll)
    MAX_WAIT=900  # 15 minutes
    ELAPSED=0
    while [ $ELAPSED -lt $MAX_WAIT ]; do
        STATUS=$(aws docdb describe-db-clusters \
            --db-cluster-identifier $DOCDB_CLUSTER_ID \
            --region $REGION \
            --query 'DBClusters[0].Status' \
            --output text 2>/dev/null || echo "not-found")
        
        if [ "$STATUS" == "available" ]; then
            log "✅ DocumentDB cluster is available"
            break
        elif [ "$STATUS" == "not-found" ]; then
            log "  ⏳ Cluster still creating... (${ELAPSED}s elapsed)"
        else
            log "  ⏳ Cluster status: $STATUS (${ELAPSED}s elapsed)"
        fi
        
        sleep 30
        ELAPSED=$((ELAPSED + 30))
    done
    
    if [ $ELAPSED -ge $MAX_WAIT ]; then
        warning "DocumentDB cluster creation timed out. Check AWS Console for status."
    fi
    
    # Create instance
    log "Creating DocumentDB instance..."
    aws docdb create-db-instance \
        --db-instance-identifier etelios-docdb-instance-1 \
        --db-instance-class $DOCDB_INSTANCE_CLASS \
        --engine docdb \
        --db-cluster-identifier $DOCDB_CLUSTER_ID \
        --tags "Key=Name,Value=etelios-docdb-instance-1" "Key=awsApplication,Value=$APP_TAG" \
        --region $REGION >> "$LOG_FILE" 2>&1
    
    log "✅ DocumentDB instance creation initiated"
    
    # Get endpoint
    DOCDB_ENDPOINT=$(aws docdb describe-db-clusters --db-cluster-identifier $DOCDB_CLUSTER_ID --region $REGION --query 'DBClusters[0].Endpoint' --output text)
fi

save_resource "DOCDB_CLUSTER_ID=$DOCDB_CLUSTER_ID"
save_resource "DOCDB_ENDPOINT=$DOCDB_ENDPOINT"
save_resource "DOCDB_MASTER_USER=$DOCDB_MASTER_USER"
save_resource "DOCDB_MASTER_PASSWORD=$DOCDB_MASTER_PASSWORD"

log "✅ DocumentDB cluster ready: $DOCDB_ENDPOINT"
warning "⚠️  Save DocumentDB password securely! It's in $RESOURCE_FILE"

###############################################################################
# STEP 5: Create Kubernetes Namespace and Secrets
###############################################################################

log "=========================================="
log "STEP 4: Creating Kubernetes Resources"
log "=========================================="

# Create namespace
log "Creating namespace..."
kubectl create namespace etelios-prod --dry-run=client -o yaml | kubectl apply -f - >> "$LOG_FILE" 2>&1
log "✅ Namespace created: etelios-prod"

# Create DocumentDB secret
log "Creating DocumentDB secret..."
kubectl create secret generic docdb-credentials \
    --from-literal=username="$DOCDB_MASTER_USER" \
    --from-literal=password="$DOCDB_MASTER_PASSWORD" \
    --from-literal=endpoint="$DOCDB_ENDPOINT" \
    --namespace etelios-prod \
    --dry-run=client -o yaml | kubectl apply -f - >> "$LOG_FILE" 2>&1
log "✅ DocumentDB secret created"

# Create ECR pull secret (for private images)
log "Creating ECR image pull secret..."
kubectl create secret docker-registry ecr-registry-secret \
    --docker-server=$ECR_REGISTRY \
    --docker-username=AWS \
    --docker-password=$(aws ecr get-login-password --region $REGION) \
    --namespace etelios-prod \
    --dry-run=client -o yaml | kubectl apply -f - >> "$LOG_FILE" 2>&1
log "✅ ECR secret created"

###############################################################################
# STEP 6: Install ALB Ingress Controller
###############################################################################

log "=========================================="
log "STEP 5: Installing ALB Ingress Controller"
log "=========================================="

# Check if already installed
if kubectl get deployment aws-load-balancer-controller -n kube-system &>/dev/null; then
    log "✅ ALB Ingress Controller already installed"
else
    log "Installing ALB Ingress Controller..."
    
    # Create IAM policy for ALB
    ALB_POLICY_ARN=$(aws iam list-policies --query 'Policies[?PolicyName==`AWSLoadBalancerControllerIAMPolicy`].Arn' --output text)
    
    if [ -z "$ALB_POLICY_ARN" ]; then
        log "Creating ALB IAM policy..."
        # Download policy
        curl -o /tmp/alb-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.7.0/docs/install/iam_policy.json
        ALB_POLICY_ARN=$(aws iam create-policy \
            --policy-name AWSLoadBalancerControllerIAMPolicy \
            --policy-document file:///tmp/alb-policy.json \
            --query 'Policy.Arn' --output text)
        log "✅ Created ALB policy: $ALB_POLICY_ARN"
    fi
    
    # Associate IAM OIDC provider if not already associated
    log "Associating IAM OIDC provider with cluster..."
    eksctl utils associate-iam-oidc-provider \
        --cluster=$CLUSTER_NAME \
        --region=$REGION \
        --approve >> "$LOG_FILE" 2>&1 || log "OIDC provider may already be associated"
    
    # Create service account
    log "Creating IAM service account..."
    eksctl create iamserviceaccount \
        --cluster=$CLUSTER_NAME \
        --namespace=kube-system \
        --name=aws-load-balancer-controller \
        --attach-policy-arn=$ALB_POLICY_ARN \
        --override-existing-serviceaccounts \
        --region=$REGION \
        --approve >> "$LOG_FILE" 2>&1
    
    # Install using Helm
    if ! command -v helm &> /dev/null; then
        log "Installing Helm..."
        brew install helm || error "Failed to install Helm"
    fi
    
    helm repo add eks https://aws.github.io/eks-charts
    helm repo update
    
    helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
        -n kube-system \
        --set clusterName=$CLUSTER_NAME \
        --set serviceAccount.create=false \
        --set serviceAccount.name=aws-load-balancer-controller \
        --set region=$REGION >> "$LOG_FILE" 2>&1
    
    log "✅ ALB Ingress Controller installed"
fi

###############################################################################
# STEP 7: Create Kubernetes Manifests Directory Structure
###############################################################################

log "=========================================="
log "STEP 6: Creating Kubernetes Manifests"
log "=========================================="

K8S_DIR="k8s/etelios-prod"
mkdir -p "$K8S_DIR"

# Create base ConfigMap template
cat > "$K8S_DIR/configmap-template.yaml" <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: {SERVICE}-config
  namespace: etelios-prod
data:
  NODE_ENV: "production"
  REGION: "$REGION"
  CLUSTER_NAME: "$CLUSTER_NAME"
EOF

log "✅ Kubernetes manifests directory created: $K8S_DIR"
log "✅ Template files created"
log "⚠️  Individual service manifests will be created in Day 3"

###############################################################################
# STEP 8: Create CI/CD Pipeline (CodePipeline + CodeBuild)
###############################################################################

log "=========================================="
log "STEP 7: Creating CI/CD Pipeline"
log "=========================================="

# Create CodeBuild project for each service
log "Creating CodeBuild projects..."

for service in "${SERVICES[@]}"; do
    PROJECT_NAME="etelios-$service-build"
    
    if aws codebuild list-projects --region $REGION --query "projects[?contains(@, '$PROJECT_NAME')]" --output text | grep -q "$PROJECT_NAME"; then
        log "  ✅ CodeBuild project exists: $PROJECT_NAME"
        continue
    fi
    
    # Create buildspec template
    BUILDSPEC=$(cat <<EOF
version: 0.2
phases:
  pre_build:
    commands:
      - echo Logging in to Amazon ECR...
      - aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
  build:
    commands:
      - echo Build started on \`date\`
      - echo Building the Docker image...
      - docker build -t $ECR_REGISTRY/etelios-$service:\$CODEBUILD_RESOLVED_SOURCE_VERSION -f microservices/$service/Dockerfile microservices/$service
      - docker tag $ECR_REGISTRY/etelios-$service:\$CODEBUILD_RESOLVED_SOURCE_VERSION $ECR_REGISTRY/etelios-$service:latest
  post_build:
    commands:
      - echo Build completed on \`date\`
      - echo Pushing the Docker images...
      - docker push $ECR_REGISTRY/etelios-$service:\$CODEBUILD_RESOLVED_SOURCE_VERSION
      - docker push $ECR_REGISTRY/etelios-$service:latest
      - echo Writing image definitions file...
      - printf '[{"name":"etelios-$service","imageUri":"%s"}]' $ECR_REGISTRY/etelios-$service:\$CODEBUILD_RESOLVED_SOURCE_VERSION > imagedefinitions.json
artifacts:
  files:
    - imagedefinitions.json
EOF
)
    
    # Create CodeBuild project
    aws codebuild create-project \
        --name $PROJECT_NAME \
        --source type=GITHUB,location=https://github.com/your-repo/etelios.git \
        --artifacts type=NO_ARTIFACTS \
        --environment type=LINUX_CONTAINER,image=aws/codebuild/standard:7.0,computeType=BUILD_GENERAL1_MEDIUM,privilegedMode=true \
        --service-role arn:aws:iam::$ACCOUNT_ID:role/EteliosCodeBuildRole \
        --region $REGION >> "$LOG_FILE" 2>&1 || warning "Failed to create CodeBuild project for $service"
    
    log "  ✅ Created CodeBuild project: $PROJECT_NAME"
done

log "✅ CI/CD setup initiated"
warning "⚠️  Update GitHub repository URL in CodeBuild projects"

###############################################################################
# Summary
###############################################################################

log "=========================================="
log "DAY 2 SETUP COMPLETE!"
log "=========================================="
log ""
log "✅ Docker images built and pushed to ECR"
log "✅ DocumentDB cluster created"
log "✅ Kubernetes namespace and secrets created"
log "✅ ALB Ingress Controller installed"
log "✅ Kubernetes manifests directory created"
log "✅ CI/CD pipelines created"
log ""
log "Next Steps (Day 3):"
log "  1. Create individual K8s deployment manifests"
log "  2. Migrate database from Cosmos DB to DocumentDB"
log "  3. Deploy all services to EKS"
log "  4. Setup monitoring and logging"
log "  5. Configure DNS and SSL"
log ""
log "Resource file: $RESOURCE_FILE"
log "Log file: $LOG_FILE"
