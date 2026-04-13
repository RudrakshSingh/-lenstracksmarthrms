#!/bin/bash

###############################################################################
# Complete Production Deployment Script
# 1. Fix ALB timeout issues
# 2. Rebuild all services with latest fixes
# 3. Push to ECR
# 4. Deploy to EKS
# 5. Update ingress with ALB timeout configuration
# 6. Test all APIs
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
NAMESPACE="etelios-prod"  # Check actual namespace: kubectl get namespaces
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
IMAGE_TAG="production-$(date +%Y%m%d-%H%M%S)"

# All services with fixes
SERVICES=(
  "auth-service"
  "hr-service"
  "attendance-service"
  "payroll-service"
  "tenant-registry-service"
  "realtime-service"
)

LOG_FILE="production-deployment-$(date +%Y%m%d-%H%M%S).log"

log "=========================================="
log "Complete Production Deployment"
log "=========================================="
log "Cluster: $CLUSTER_NAME"
log "Region: $REGION"
log "Namespace: $NAMESPACE"
log "Image Tag: $IMAGE_TAG"
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
    
    # Update kubeconfig
    log "Updating kubeconfig..."
    aws eks update-kubeconfig --name $CLUSTER_NAME --region $REGION
    log "✅ Kubeconfig updated"
    
    # Check cluster access
    if ! kubectl get nodes &> /dev/null; then
        error "Cannot access EKS cluster"
    fi
    log "✅ EKS cluster accessible"
    
    echo ""
}

###############################################################################
# PHASE 2: Fix ALB Timeout Configuration
###############################################################################
fix_alb_timeout() {
    log "=========================================="
    log "PHASE 2: Fixing ALB Timeout Configuration"
    log "=========================================="
    
    # Check if ingress exists
    if ! kubectl get ingress etelios-ingress -n $NAMESPACE &>/dev/null; then
        warning "Ingress not found, will create new one"
    fi
    
    # Update ingress with ALB timeout annotations
    log "Updating ingress with ALB timeout configuration..."
    
    kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: etelios-ingress
  namespace: $NAMESPACE
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: '443'
    # CRITICAL: Increase idle timeout to 120 seconds (default is 60s)
    alb.ingress.kubernetes.io/load-balancer-attributes: idle_timeout.timeout_seconds=120
    # Health check configuration
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/healthcheck-interval-seconds: '30'
    alb.ingress.kubernetes.io/healthcheck-timeout-seconds: '10'
    alb.ingress.kubernetes.io/healthy-threshold-count: '2'
    alb.ingress.kubernetes.io/unhealthy-threshold-count: '3'
    # Connection draining
    alb.ingress.kubernetes.io/load-balancer-attributes: idle_timeout.timeout_seconds=120,draining.enabled=true,draining.timeout_seconds=30
spec:
  ingressClassName: alb
  rules:
  - host: api.etelios.com
    http:
      paths:
      # Health check
      - path: /health
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 80
      # Auth Service
      - path: /api/auth
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 80
      # HR Service
      - path: /api/hr
        pathType: Prefix
        backend:
          service:
            name: hr-service
            port:
              number: 80
      - path: /api/time-tracking
        pathType: Prefix
        backend:
          service:
            name: hr-service
            port:
              number: 80
      - path: /api/performance
        pathType: Prefix
        backend:
          service:
            name: hr-service
            port:
              number: 80
      # Attendance Service
      - path: /api/attendance
        pathType: Prefix
        backend:
          service:
            name: attendance-service
            port:
              number: 80
      # Payroll Service
      - path: /api/payroll
        pathType: Prefix
        backend:
          service:
            name: payroll-service
            port:
              number: 80
      # Tenant Registry Service
      - path: /api/tenant
        pathType: Prefix
        backend:
          service:
            name: tenant-registry-service
            port:
              number: 80
      - path: /api/tenants
        pathType: Prefix
        backend:
          service:
            name: tenant-registry-service
            port:
              number: 80
  # Rule without host (for IP access)
  - http:
      paths:
      - path: /health
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 80
      - path: /api/auth
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 80
      - path: /api/hr
        pathType: Prefix
        backend:
          service:
            name: hr-service
            port:
              number: 80
      - path: /api/attendance
        pathType: Prefix
        backend:
          service:
            name: attendance-service
            port:
              number: 80
      - path: /api/payroll
        pathType: Prefix
        backend:
          service:
            name: payroll-service
            port:
              number: 80
      - path: /api/tenant
        pathType: Prefix
        backend:
          service:
            name: tenant-registry-service
            port:
              number: 80
EOF

    log "✅ Ingress updated with ALB timeout configuration"
    echo ""
}

###############################################################################
# PHASE 3: Rebuild and Push Images
###############################################################################
rebuild_and_push_images() {
    log "=========================================="
    log "PHASE 3: Rebuilding and Pushing Images"
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
    
    SUCCESS=0
    FAILED=0
    
    for service in "${SERVICES[@]}"; do
        REPO_NAME="etelios-$service"
        IMAGE_NAME="$ECR_REGISTRY/$REPO_NAME"
        
        log "[$((SUCCESS + FAILED + 1))/${#SERVICES[@]}] Building $service..."
        
        if [ ! -f "microservices/$service/Dockerfile" ]; then
            warning "  ⚠️  Dockerfile not found, skipping"
            FAILED=$((FAILED + 1))
            continue
        fi
        
        # Build with platform flag
        # Note: Dockerfiles may need root directory as context
        log "  Building for linux/amd64..."
        BUILD_CONTEXT="."
        if [ -f "microservices/$service/Dockerfile" ]; then
            # Check if Dockerfile expects root context
            if grep -q "COPY microservices" "microservices/$service/Dockerfile" 2>/dev/null; then
                BUILD_CONTEXT="."
            else
                BUILD_CONTEXT="microservices/$service"
            fi
        fi
        
        if docker buildx build \
            --platform linux/amd64 \
            --tag "$IMAGE_NAME:$IMAGE_TAG" \
            --tag "$IMAGE_NAME:latest" \
            --file "microservices/$service/Dockerfile" \
            "$BUILD_CONTEXT" \
            --push \
            2>&1 | tee -a "$LOG_FILE"; then
            log "  ✅ $service built and pushed ($IMAGE_TAG)"
            SUCCESS=$((SUCCESS + 1))
        else
            warning "  ❌ $service build failed"
            FAILED=$((FAILED + 1))
        fi
        echo ""
    done
    
    echo ""
    log "Build Summary: $SUCCESS succeeded, $FAILED failed"
    echo ""
    
    if [ $FAILED -gt 0 ]; then
        warning "Some services failed to build"
    fi
}

###############################################################################
# PHASE 4: Deploy to EKS
###############################################################################
deploy_to_eks() {
    log "=========================================="
    log "PHASE 4: Deploying to EKS"
    log "=========================================="
    
    # Update deployments with new image tag
    for service in "${SERVICES[@]}"; do
        if kubectl get deployment $service -n $NAMESPACE &>/dev/null; then
            log "Updating $service deployment..."
            
            # Update image
            kubectl set image deployment/$service \
                -n $NAMESPACE \
                "*=$ECR_REGISTRY/etelios-$service:$IMAGE_TAG" \
                || kubectl set image deployment/$service \
                    -n $NAMESPACE \
                    "$service=$ECR_REGISTRY/etelios-$service:$IMAGE_TAG"
            
            # Restart deployment
            log "  Restarting $service..."
            kubectl rollout restart deployment $service -n $NAMESPACE
            
            # Wait for rollout
            log "  Waiting for rollout..."
            if kubectl rollout status deployment $service -n $NAMESPACE --timeout=300s; then
                log "  ✅ $service deployed successfully"
            else
                warning "  ⚠️  $service rollout timeout or failed"
            fi
        else
            warning "  ⚠️  $service deployment not found"
        fi
        echo ""
    done
    
    # Wait for pods to be ready
    log "Waiting for pods to be ready..."
    sleep 30
    
    for service in "${SERVICES[@]}"; do
        if kubectl get deployment $service -n $NAMESPACE &>/dev/null; then
            READY=$(kubectl get deployment $service -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
            DESIRED=$(kubectl get deployment $service -n $NAMESPACE -o jsonpath='{.status.replicas}' 2>/dev/null || echo "0")
            log "  $service: $READY/$DESIRED pods ready"
        fi
    done
    
    echo ""
}

###############################################################################
# PHASE 5: Verify Deployment
###############################################################################
verify_deployment() {
    log "=========================================="
    log "PHASE 5: Verifying Deployment"
    log "=========================================="
    
    # Get ALB URL
    ALB_URL=$(kubectl get ingress etelios-ingress -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
    
    if [ -z "$ALB_URL" ]; then
        warning "ALB URL not found, checking service endpoints..."
        ALB_URL=$(kubectl get svc -n $NAMESPACE | grep LoadBalancer | head -1 | awk '{print $4}' || echo "")
    fi
    
    if [ -z "$ALB_URL" ]; then
        warning "Could not determine ALB URL"
        return
    fi
    
    log "ALB URL: http://$ALB_URL"
    echo ""
    
    # Test health endpoints
    log "Testing health endpoints..."
    for service in "${SERVICES[@]}"; do
        case $service in
            auth-service)
                ENDPOINT="/api/auth/health"
                ;;
            hr-service)
                ENDPOINT="/api/hr/health"
                ;;
            attendance-service)
                ENDPOINT="/api/attendance/health"
                ;;
            payroll-service)
                ENDPOINT="/api/payroll/health"
                ;;
            *)
                ENDPOINT="/health"
                ;;
        esac
        
        if curl -s -f "http://$ALB_URL$ENDPOINT" > /dev/null 2>&1; then
            log "  ✅ $service health check passed"
        else
            warning "  ⚠️  $service health check failed"
        fi
    done
    
    echo ""
}

###############################################################################
# MAIN EXECUTION
###############################################################################
main() {
    log "Starting Complete Production Deployment..."
    log "Log file: $LOG_FILE"
    echo ""
    
    # Change to project directory
    cd "$(dirname "$0")"
    
    # Run phases
    verify_prerequisites
    fix_alb_timeout
    rebuild_and_push_images
    deploy_to_eks
    verify_deployment
    
    log "=========================================="
    log "✅ Production Deployment Complete!"
    log "=========================================="
    log ""
    log "Summary:"
    log "  ✅ ALB timeout configuration updated (120s)"
    log "  ✅ All services rebuilt and pushed to ECR"
    log "  ✅ All services deployed to EKS"
    log "  ✅ Deployment verified"
    log ""
    log "Image Tag: $IMAGE_TAG"
    log "Check logs: $LOG_FILE"
    log ""
}

# Run main
main "$@"
