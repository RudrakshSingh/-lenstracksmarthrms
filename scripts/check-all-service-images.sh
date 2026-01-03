#!/bin/bash

# Script to check all services image pull status
# Checks if services are pulling new images correctly

NAMESPACE="etelios-backend-prod"

echo "=================================================================================="
echo "🔍 COMPREHENSIVE SERVICE IMAGE STATUS CHECK"
echo "=================================================================================="
echo ""

# Check deployments
echo "📋 DEPLOYMENTS - Image Configuration:"
echo "─────────────────────────────────────────────────────────────────────────────────"
kubectl get deployments -n $NAMESPACE -o custom-columns=NAME:.metadata.name,IMAGE:.spec.template.spec.containers[0].image,PULL_POLICY:.spec.template.spec.containers[0].imagePullPolicy 2>&1
echo ""

# Check pods status
echo "📊 PODS - Current Status:"
echo "─────────────────────────────────────────────────────────────────────────────────"
kubectl get pods -n $NAMESPACE -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,READY:.status.containerStatuses[0].ready,IMAGE:.status.containerStatuses[0].image 2>&1 | head -30
echo ""

# Check for image pull errors
echo "❌ IMAGE PULL ERRORS:"
echo "─────────────────────────────────────────────────────────────────────────────────"
ERROR_PODS=$(kubectl get pods -n $NAMESPACE -o jsonpath='{range .items[?(@.status.containerStatuses[0].state.waiting.reason=="ImagePullBackOff" || @.status.containerStatuses[0].state.waiting.reason=="ErrImagePull")]}{.metadata.name}{"\t"}{.status.containerStatuses[0].state.waiting.reason}{"\t"}{.status.containerStatuses[0].state.waiting.message}{"\n"}{end}' 2>&1)

if [ -z "$ERROR_PODS" ]; then
    echo "✅ No image pull errors found"
else
    echo "$ERROR_PODS"
fi
echo ""

# Check each service individually
echo "🔹 SERVICE-BY-SERVICE DETAILS:"
echo "─────────────────────────────────────────────────────────────────────────────────"

SERVICES=("auth-service" "hr-service" "attendance-service" "tenant-registry-service" "tenant-management-service")

for service in "${SERVICES[@]}"; do
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔹 $service"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Get deployment image
    DEPLOYMENT_IMAGE=$(kubectl get deployment $service -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null)
    PULL_POLICY=$(kubectl get deployment $service -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].imagePullPolicy}' 2>/dev/null)
    
    if [ -z "$DEPLOYMENT_IMAGE" ]; then
        echo "❌ Deployment not found"
        continue
    fi
    
    echo "Deployment Image: $DEPLOYMENT_IMAGE"
    echo "Pull Policy: ${PULL_POLICY:-IfNotPresent}"
    echo ""
    
    # Get pod status
    PODS=$(kubectl get pods -n $NAMESPACE -l app=$service -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[0].image}{"\t"}{.status.phase}{"\t"}{.status.containerStatuses[0].ready}{"\n"}{end}' 2>/dev/null)
    
    if [ -z "$PODS" ]; then
        echo "⚠️  No pods found for this service"
    else
        echo "Pods:"
        echo "$PODS" | while IFS=$'\t' read -r name image phase ready; do
            if [ "$image" != "$DEPLOYMENT_IMAGE" ]; then
                echo "  ⚠️  $name: Image mismatch! (Pod: $image)"
            else
                echo "  ✅ $name: $phase, Ready: $ready"
            fi
        done
    fi
    
    # Check for errors
    ERRORS=$(kubectl get pods -n $NAMESPACE -l app=$service -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[0].state.waiting.reason}{"\n"}{end}' 2>/dev/null | grep -E "ImagePull|ErrImage")
    if [ ! -z "$ERRORS" ]; then
        echo ""
        echo "❌ Errors:"
        echo "$ERRORS"
    fi
done

echo ""
echo "=================================================================================="
echo "📊 SUMMARY"
echo "=================================================================================="

# Count services
TOTAL_SERVICES=$(kubectl get deployments -n $NAMESPACE --no-headers 2>/dev/null | wc -l | tr -d ' ')
READY_PODS=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers 2>/dev/null | grep -c "1/1\|2/2" || echo "0")
ERROR_PODS=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | grep -cE "ImagePullBackOff|ErrImagePull" || echo "0")

echo "Total Services: $TOTAL_SERVICES"
echo "Ready Pods: $READY_PODS"
echo "Image Pull Errors: $ERROR_PODS"
echo ""

if [ "$ERROR_PODS" -gt 0 ]; then
    echo "⚠️  Some pods have image pull errors. Check details above."
else
    echo "✅ No image pull errors detected"
fi

echo ""
echo "💡 To force image pull, update deployment with:"
echo "   kubectl set image deployment/<service-name> <container-name>=<image>:latest -n $NAMESPACE"
echo "   kubectl rollout restart deployment/<service-name> -n $NAMESPACE"

