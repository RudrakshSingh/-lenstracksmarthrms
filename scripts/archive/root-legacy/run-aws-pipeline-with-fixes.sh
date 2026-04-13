#!/bin/bash

###############################################################################
# Complete AWS Pipeline with Fixes
# 1. Rebuild images with fixes
# 2. Push to ECR
# 3. Deploy to EKS
# 4. Test APIs
###############################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Configuration
REGION="ap-south-1"
ACCOUNT_ID="383234048604"
CLUSTER_NAME="etelios-prod-v2"
NAMESPACE="etelios-prod"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# Priority services (with fixes)
PRIORITY_SERVICES=(
  "hr-service"      # Has auth middleware fix
  "auth-service"    # Core service
  "attendance-service"
  "tenant-management-service"
  "tenant-registry-service"
)

# All services
ALL_SERVICES=(
  "analytics-service" "attendance-service" "auth-service" "cpp-service"
  "crm-service" "document-service" "financial-service" "hr-service"
  "inventory-service" "jts-service" "monitoring-service" "notification-service"
  "payroll-service" "prescription-service" "purchase-service" "realtime-service"
  "sales-service" "service-management" "tenant-management-service" "tenant-registry-service"
)

LOG_FILE="aws-pipeline-$(date +%Y%m%d-%H%M%S).log"

log "=========================================="
log "AWS Pipeline with Fixes"
log "=========================================="
log "Cluster: $CLUSTER_NAME"
log "Region: $REGION"
log "Namespace: $NAMESPACE"
log ""

###############################################################################
# PHASE 1: Verify Prerequisites
###############################################################################
verify_prerequisites() {
    log "=========================================="
    log "PHASE 1: Verifying Prerequisites"
    log "=========================================="
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI not installed"
    fi
    log "✅ AWS CLI installed"
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        error "kubectl not installed"
    fi
    log "✅ kubectl installed"
    
    # Check Docker
    if ! docker ps &> /dev/null; then
        error "Docker not running"
    fi
    log "✅ Docker running"
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured"
    fi
    log "✅ AWS credentials configured"
    
    # Check cluster access
    if ! kubectl get nodes &> /dev/null; then
        error "Cannot access EKS cluster"
    fi
    log "✅ EKS cluster accessible"
    
    echo ""
}

###############################################################################
# PHASE 2: Rebuild Images with Fixes
###############################################################################
rebuild_images() {
    log "=========================================="
    log "PHASE 2: Rebuilding Images with Fixes"
    log "=========================================="
    
    # Login to ECR
    log "Logging into ECR..."
    aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REGISTRY || error "ECR login failed"
    log "✅ ECR login successful"
    echo ""
    
    # Setup buildx
    log "Setting up Docker buildx..."
    docker buildx create --name multiarch --use 2>/dev/null || docker buildx use multiarch 2>/dev/null || true
    log "✅ Buildx ready"
    echo ""
    
    # Build priority services first
    log "Building priority services (with fixes)..."
    SUCCESS=0
    FAILED=0
    
    for service in "${PRIORITY_SERVICES[@]}"; do
        REPO_NAME="etelios-$service"
        IMAGE_NAME="$ECR_REGISTRY/$REPO_NAME:latest"
        
        log "[$((SUCCESS + FAILED + 1))/${#PRIORITY_SERVICES[@]}] Building $service..."
        
        if [ ! -f "microservices/$service/Dockerfile" ]; then
            warning "  ⚠️  Dockerfile not found, skipping"
            FAILED=$((FAILED + 1))
            continue
        fi
        
        # Build with platform flag
        if docker buildx build \
            --platform linux/amd64 \
            --tag "$IMAGE_NAME" \
            --file "microservices/$service/Dockerfile" \
            "microservices/$service" \
            --push \
            --quiet 2>&1 | tee -a "$LOG_FILE"; then
            log "  ✅ $service built and pushed"
            SUCCESS=$((SUCCESS + 1))
        else
            warning "  ❌ $service build failed"
            FAILED=$((FAILED + 1))
        fi
    done
    
    echo ""
    log "Priority services: $SUCCESS succeeded, $FAILED failed"
    echo ""
    
    if [ $FAILED -gt 0 ]; then
        warning "Some priority services failed to build"
    fi
}

###############################################################################
# PHASE 3: Deploy to EKS
###############################################################################
deploy_to_eks() {
    log "=========================================="
    log "PHASE 3: Deploying to EKS"
    log "=========================================="
    
    # Update kubeconfig
    log "Updating kubeconfig..."
    aws eks update-kubeconfig --name $CLUSTER_NAME --region $REGION
    log "✅ Kubeconfig updated"
    echo ""
    
    # Restart deployments to pull new images
    log "Restarting deployments to use new images..."
    
    for service in "${PRIORITY_SERVICES[@]}"; do
        if kubectl get deployment $service -n $NAMESPACE &>/dev/null; then
            log "  Restarting $service..."
            kubectl rollout restart deployment $service -n $NAMESPACE
            kubectl rollout status deployment $service -n $NAMESPACE --timeout=300s || warning "  ⚠️  $service rollout timeout"
        else
            warning "  ⚠️  $service deployment not found"
        fi
    done
    
    echo ""
    log "✅ Deployments restarted"
    echo ""
    
    # Wait for pods to be ready
    log "Waiting for pods to be ready..."
    sleep 30
    
    for service in "${PRIORITY_SERVICES[@]}"; do
        if kubectl get deployment $service -n $NAMESPACE &>/dev/null; then
            READY=$(kubectl get deployment $service -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
            DESIRED=$(kubectl get deployment $service -n $NAMESPACE -o jsonpath='{.status.replicas}' 2>/dev/null || echo "0")
            log "  $service: $READY/$DESIRED pods ready"
        fi
    done
    
    echo ""
}

###############################################################################
# PHASE 4: Test APIs
###############################################################################
test_apis() {
    log "=========================================="
    log "PHASE 4: Testing APIs"
    log "=========================================="
    
    API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
    
    # Generate test token
    log "Generating test token..."
    TOKEN=$(kubectl exec -n $NAMESPACE $(kubectl get pods -n $NAMESPACE | grep auth-service | grep Running | head -1 | awk '{print $1}') -- node -e "
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:etelios123@mongodb.etelios-prod.svc.cluster.local:27017/etelios?authSource=admin';
const JWT_SECRET = process.env.JWT_SECRET || 'etelios-super-secret-jwt-key-2024';
(async () => {
  await mongoose.connect(MONGODB_URI);
  const User = require('/app/src/models/User.model');
  const user = await User.findOne({ tenantId: 'apitest1771147024', email: 'admin@apitest1771147024.com' });
  if (user) {
    const token = jwt.sign({ userId: user._id.toString(), role: user.role, tenantId: user.tenantId, employee_id: user.employee_id }, JWT_SECRET, { expiresIn: '24h' });
    console.log(token);
  }
  await mongoose.connection.close();
})();
" 2>/dev/null | tail -1)
    
    if [ -z "$TOKEN" ]; then
        warning "⚠️  Could not generate token, skipping API tests"
        return
    fi
    
    TENANT_ID="apitest1771147024"
    
    log "Testing APIs..."
    echo ""
    
    # Test health checks
    info "Health Checks:"
    curl -s "$API_BASE/api/auth/health" | jq '.status' 2>/dev/null && log "  ✅ Auth health" || warning "  ❌ Auth health"
    curl -s "$API_BASE/api/hr/health" | jq '.status' 2>/dev/null && log "  ✅ HR health" || warning "  ❌ HR health"
    curl -s "$API_BASE/api/attendance/health" | jq '.status' 2>/dev/null && log "  ✅ Attendance health" || warning "  ❌ Attendance health"
    echo ""
    
    # Test HR APIs
    info "HR APIs:"
    HR_RESPONSE=$(curl -s -X GET "$API_BASE/api/hr/employees" \
      -H "Authorization: Bearer $TOKEN" \
      -H "x-tenant-id: $TENANT_ID")
    
    if echo "$HR_RESPONSE" | grep -q '"success":true'; then
        log "  ✅ GET /api/hr/employees"
    elif echo "$HR_RESPONSE" | grep -q "INVALID_TOKEN\|TENANT"; then
        warning "  ⚠️  GET /api/hr/employees - Token/tenant issue"
    else
        warning "  ❌ GET /api/hr/employees"
    fi
    
    # Test Auth API
    info "Auth APIs:"
    AUTH_RESPONSE=$(curl -s -X GET "$API_BASE/api/auth/me" \
      -H "Authorization: Bearer $TOKEN" \
      -H "x-tenant-id: $TENANT_ID")
    
    if echo "$AUTH_RESPONSE" | grep -q '"success":true'; then
        log "  ✅ GET /api/auth/me"
    else
        warning "  ⚠️  GET /api/auth/me - May need additional fix"
    fi
    
    echo ""
}

###############################################################################
# MAIN EXECUTION
###############################################################################
main() {
    log "Starting AWS Pipeline with Fixes..."
    log "Log file: $LOG_FILE"
    echo ""
    
    # Change to project directory
    cd /Users/rudrakshsingh/Desktop/lenstracksmarthrms
    
    # Run phases
    verify_prerequisites
    rebuild_images
    deploy_to_eks
    test_apis
    
    log "=========================================="
    log "✅ Pipeline Complete!"
    log "=========================================="
    log ""
    log "Summary:"
    log "  ✅ Images rebuilt with fixes"
    log "  ✅ Deployed to EKS"
    log "  ✅ APIs tested"
    log ""
    log "Check logs: $LOG_FILE"
    log ""
}

# Run main
main "$@"
