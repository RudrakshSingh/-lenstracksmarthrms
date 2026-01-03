#!/bin/bash

# Complete Fix Script - Fixes all identified issues
# This script will:
# 1. Fix ACR URLs for all services
# 2. Build and push updated images
# 3. Update deployments
# 4. Restart services
# 5. Verify everything is working

set -e  # Exit on error

NAMESPACE="etelios-backend-prod"
ACR="eteliosacr-hvawabdbgge7e0fu.azurecr.io"
OLD_ACR="eteliosacr.azurecr.io"
PROJECT_ROOT="/Users/rudrakshsingh/Desktop/lenstracksmarthrms"

cd "$PROJECT_ROOT"

echo "=================================================================================="
echo "🔧 COMPLETE FIX SCRIPT - ALL ISSUES"
echo "=================================================================================="
echo ""
echo "This will fix:"
echo "  1. ACR URLs for all services"
echo "  2. Build and push updated images (auth, tenant-registry)"
echo "  3. Update deployments"
echo "  4. Restart services"
echo ""
read -p "Continue? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

# ============================================================================
# STEP 1: Fix ACR URLs
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 STEP 1: Fixing ACR URLs for all services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

DEPLOYMENTS=$(kubectl get deployments -n $NAMESPACE -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.template.spec.containers[0].image}{"\n"}{end}' | grep "$OLD_ACR" | cut -f1)

if [ -z "$DEPLOYMENTS" ]; then
    echo "✅ All services already using correct ACR URL"
else
    echo "Found services with wrong ACR URL:"
    echo "$DEPLOYMENTS" | while read -r deployment; do
        echo "  - $deployment"
    done
    echo ""
    
    for deployment in $DEPLOYMENTS; do
        CURRENT_IMAGE=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].image}')
        SERVICE_NAME=$(echo $CURRENT_IMAGE | sed "s|$OLD_ACR/||" | sed "s|:.*||")
        TAG=$(echo $CURRENT_IMAGE | sed "s|.*:||")
        NEW_IMAGE="$ACR/$SERVICE_NAME:$TAG"
        CONTAINER_NAME=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].name}')
        
        echo "🔹 Updating $deployment..."
        kubectl set image deployment/$deployment $CONTAINER_NAME=$NEW_IMAGE -n $NAMESPACE > /dev/null 2>&1
        echo "   ✅ Updated to $NEW_IMAGE"
    done
    echo ""
    echo "✅ ACR URLs fixed"
fi

# ============================================================================
# STEP 2: Login to ACR
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 STEP 2: Logging into ACR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if az acr login --name eteliosacr-hvawabdbgge7e0fu > /dev/null 2>&1; then
    echo "✅ Logged into ACR"
else
    echo "❌ Failed to login to ACR"
    echo "   Please login manually: az acr login --name eteliosacr-hvawabdbgge7e0fu"
    exit 1
fi

# ============================================================================
# STEP 3: Build and Push Images
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 STEP 3: Building and pushing images"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Auth Service
echo "🔹 Building auth-service..."
if docker build -t $ACR/auth-service:latest -f microservices/auth-service/Dockerfile . > /tmp/auth-build.log 2>&1; then
    echo "   ✅ Build successful"
    if docker push $ACR/auth-service:latest > /tmp/auth-push.log 2>&1; then
        echo "   ✅ Push successful"
    else
        echo "   ❌ Push failed. Check /tmp/auth-push.log"
        exit 1
    fi
else
    echo "   ❌ Build failed. Check /tmp/auth-build.log"
    exit 1
fi

# Tenant Registry Service
echo ""
echo "🔹 Building tenant-registry-service..."
if docker build -t $ACR/tenant-registry-service:latest -f microservices/tenant-registry-service/Dockerfile . > /tmp/tenant-build.log 2>&1; then
    echo "   ✅ Build successful"
    if docker push $ACR/tenant-registry-service:latest > /tmp/tenant-push.log 2>&1; then
        echo "   ✅ Push successful"
    else
        echo "   ❌ Push failed. Check /tmp/tenant-push.log"
        exit 1
    fi
else
    echo "   ❌ Build failed. Check /tmp/tenant-build.log"
    exit 1
fi

# ============================================================================
# STEP 4: Update Deployments
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 STEP 4: Updating deployments"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Auth Service
echo "🔹 Updating auth-service deployment..."
kubectl set image deployment/auth-service auth-service=$ACR/auth-service:latest -n $NAMESPACE
echo "   ✅ Updated"

# Tenant Registry Service
echo "🔹 Updating tenant-registry-service deployment..."
kubectl set image deployment/tenant-registry-service tenant-registry-service=$ACR/tenant-registry-service:latest -n $NAMESPACE
echo "   ✅ Updated"

# ============================================================================
# STEP 5: Restart Deployments
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 STEP 5: Restarting deployments"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

kubectl rollout restart deployment/auth-service -n $NAMESPACE
kubectl rollout restart deployment/tenant-registry-service -n $NAMESPACE

echo "✅ Deployments restarted"

# ============================================================================
# STEP 6: Wait for Rollout
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏳ STEP 6: Waiting for rollouts to complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Waiting for auth-service..."
if kubectl rollout status deployment/auth-service -n $NAMESPACE --timeout=5m > /dev/null 2>&1; then
    echo "✅ auth-service rollout complete"
else
    echo "⚠️  auth-service rollout may still be in progress"
fi

echo ""
echo "Waiting for tenant-registry-service..."
if kubectl rollout status deployment/tenant-registry-service -n $NAMESPACE --timeout=5m > /dev/null 2>&1; then
    echo "✅ tenant-registry-service rollout complete"
else
    echo "⚠️  tenant-registry-service rollout may still be in progress"
fi

# ============================================================================
# STEP 7: Verify Status
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ STEP 7: Verifying status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Pod status:"
kubectl get pods -n $NAMESPACE -l 'app in (auth-service,tenant-registry-service)' -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,READY:.status.containerStatuses[0].ready,IMAGE:.status.containerStatuses[0].image 2>/dev/null || kubectl get pods -n $NAMESPACE -l app=auth-service
kubectl get pods -n $NAMESPACE -l app=tenant-registry-service

echo ""
echo "=================================================================================="
echo "✅ FIX PROCESS COMPLETED!"
echo "=================================================================================="
echo ""
echo "🧪 Next Steps:"
echo "  1. Wait 1-2 minutes for pods to fully start"
echo "  2. Run tests: node scripts/comprehensive-api-test.js"
echo "  3. Check pod logs if issues persist"
echo ""
echo "📊 Check status:"
echo "  kubectl get pods -n $NAMESPACE"
echo "  bash scripts/check-all-service-images.sh"
echo ""

