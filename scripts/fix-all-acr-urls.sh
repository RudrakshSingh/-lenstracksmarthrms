#!/bin/bash

# Script to fix ACR URLs for all services
# Updates all deployments to use the correct ACR URL

NAMESPACE="etelios-backend-prod"
OLD_ACR="eteliosacr.azurecr.io"
NEW_ACR="eteliosacr-hvawabdbgge7e0fu.azurecr.io"

echo "=================================================================================="
echo "🔧 FIXING ACR URLs FOR ALL SERVICES"
echo "=================================================================================="
echo ""
echo "Old ACR: $OLD_ACR"
echo "New ACR: $NEW_ACR"
echo ""

# Get all deployments with wrong ACR URL
DEPLOYMENTS=$(kubectl get deployments -n $NAMESPACE -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.template.spec.containers[0].image}{"\n"}{end}' | grep "$OLD_ACR" | cut -f1)

if [ -z "$DEPLOYMENTS" ]; then
    echo "✅ All services already using correct ACR URL"
    exit 0
fi

echo "📋 Services to update:"
echo "$DEPLOYMENTS" | while read -r deployment; do
    echo "  - $deployment"
done
echo ""

# Ask for confirmation
read -p "Do you want to update all these services? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

echo ""
echo "🔄 Updating services..."
echo ""

SUCCESS=0
FAILED=0

for deployment in $DEPLOYMENTS; do
    # Get current image
    CURRENT_IMAGE=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].image}')
    
    # Extract service name and tag
    SERVICE_NAME=$(echo $CURRENT_IMAGE | sed "s|$OLD_ACR/||" | sed "s|:.*||")
    TAG=$(echo $CURRENT_IMAGE | sed "s|.*:||")
    
    # Build new image URL
    NEW_IMAGE="$NEW_ACR/$SERVICE_NAME:$TAG"
    
    # Get container name
    CONTAINER_NAME=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].name}')
    
    echo "🔹 Updating $deployment..."
    echo "   Old: $CURRENT_IMAGE"
    echo "   New: $NEW_IMAGE"
    
    # Update deployment
    if kubectl set image deployment/$deployment $CONTAINER_NAME=$NEW_IMAGE -n $NAMESPACE > /dev/null 2>&1; then
        echo "   ✅ Updated successfully"
        SUCCESS=$((SUCCESS + 1))
    else
        echo "   ❌ Failed to update"
        FAILED=$((FAILED + 1))
    fi
    echo ""
done

echo "=================================================================================="
echo "📊 SUMMARY"
echo "=================================================================================="
echo "✅ Successfully updated: $SUCCESS"
echo "❌ Failed: $FAILED"
echo ""

if [ $SUCCESS -gt 0 ]; then
    echo "🔄 Restarting deployments to pull new images..."
    for deployment in $DEPLOYMENTS; do
        kubectl rollout restart deployment/$deployment -n $NAMESPACE > /dev/null 2>&1
    done
    echo "✅ Deployments restarted"
    echo ""
    echo "⏳ Waiting for pods to be ready..."
    echo "   (This may take a few minutes)"
    echo ""
    echo "💡 Check status with:"
    echo "   kubectl get pods -n $NAMESPACE"
    echo "   bash scripts/check-all-service-images.sh"
fi

