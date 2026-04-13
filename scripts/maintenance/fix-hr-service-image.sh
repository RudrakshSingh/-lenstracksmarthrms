#!/bin/bash

# Script to fix HR Service image issues in production
# Checks and fixes image pull errors, updates deployment, restarts pods

NAMESPACE="etelios-backend-prod"
SERVICE_NAME="hr-service"
ACR_NAME="eteliosacr-hvawabdbgge7e0fu.azurecr.io"
IMAGE_NAME="${ACR_NAME}/${SERVICE_NAME}:latest"

echo "🔧 Fixing HR Service Image Issues"
echo "=================================="
echo ""
echo "Service: $SERVICE_NAME"
echo "Namespace: $NAMESPACE"
echo "Image: $IMAGE_NAME"
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install kubectl first."
    exit 1
fi

# Check if we can access the cluster
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Cannot access Kubernetes cluster. Please configure kubectl."
    exit 1
fi

echo "📊 Current Status:"
echo ""

# Check deployment
echo "1. Checking deployment..."
deployment_exists=$(kubectl get deployment $SERVICE_NAME -n $NAMESPACE 2>/dev/null)
if [ -z "$deployment_exists" ]; then
    echo "   ❌ Deployment not found: $SERVICE_NAME"
    exit 1
fi

current_image=$(kubectl get deployment $SERVICE_NAME -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null)
echo "   Current Image: $current_image"

# Check pods
echo ""
echo "2. Checking pods..."
pods=$(kubectl get pods -n $NAMESPACE -l app=$SERVICE_NAME 2>/dev/null)
if [ -z "$pods" ]; then
    echo "   ⚠️  No pods found"
else
    kubectl get pods -n $NAMESPACE -l app=$SERVICE_NAME | head -5
fi

# Check for image pull errors
echo ""
echo "3. Checking for image pull errors..."
image_pull_errors=$(kubectl get pods -n $NAMESPACE -l app=$SERVICE_NAME -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[0].state.waiting.reason}{"\n"}{end}' 2>/dev/null | grep -i "ImagePull\|ErrImagePull\|ImagePullBackOff")

if [ -n "$image_pull_errors" ]; then
    echo "   ❌ Image pull errors found:"
    echo "$image_pull_errors"
    echo ""
    echo "🔧 Fixing image issues..."
    
    # Update deployment with correct image
    echo "   Updating deployment image to: $IMAGE_NAME"
    kubectl set image deployment/$SERVICE_NAME $SERVICE_NAME=$IMAGE_NAME -n $NAMESPACE
    
    # Wait a moment
    sleep 2
    
    # Restart deployment
    echo "   Restarting deployment..."
    kubectl rollout restart deployment/$SERVICE_NAME -n $NAMESPACE
    
    echo "   ✅ Deployment updated and restarted"
else
    echo "   ✅ No image pull errors found"
fi

# Check if image needs update
if [ "$current_image" != "$IMAGE_NAME" ]; then
    echo ""
    echo "4. Image mismatch detected!"
    echo "   Current: $current_image"
    echo "   Expected: $IMAGE_NAME"
    echo ""
    echo "🔧 Updating image..."
    
    kubectl set image deployment/$SERVICE_NAME $SERVICE_NAME=$IMAGE_NAME -n $NAMESPACE
    
    echo "   ✅ Image updated"
    echo "   Restarting deployment..."
    kubectl rollout restart deployment/$SERVICE_NAME -n $NAMESPACE
else
    echo ""
    echo "4. Image is correct: $IMAGE_NAME"
fi

# Wait for rollout
echo ""
echo "5. Waiting for rollout to complete..."
kubectl rollout status deployment/$SERVICE_NAME -n $NAMESPACE --timeout=120s

# Final status
echo ""
echo "📊 Final Status:"
echo ""
kubectl get pods -n $NAMESPACE -l app=$SERVICE_NAME

echo ""
echo "✅ Done!"
echo ""
echo "📝 Next Steps:"
echo "   1. Check pod logs: kubectl logs -n $NAMESPACE -l app=$SERVICE_NAME --tail=50"
echo "   2. Test registration endpoint"
echo "   3. Verify fix is working"

