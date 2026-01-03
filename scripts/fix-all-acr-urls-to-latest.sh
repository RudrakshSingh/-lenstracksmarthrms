#!/bin/bash

# Script to fix ACR URLs for all services and ensure they use latest images

NAMESPACE="etelios-backend-prod"
WRONG_ACR="eteliosacr.azurecr.io"
CORRECT_ACR="eteliosacr-hvawabdbgge7e0fu.azurecr.io"

echo "🔧 Fixing ACR URLs for All Services"
echo "===================================="
echo ""
echo "Namespace: $NAMESPACE"
echo "Updating from: $WRONG_ACR"
echo "Updating to: $CORRECT_ACR"
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install kubectl first."
    exit 1
fi

# Get all deployments
deployments=$(kubectl get deployments -n $NAMESPACE -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' 2>/dev/null)

if [ -z "$deployments" ]; then
    echo "❌ No deployments found in namespace $NAMESPACE"
    exit 1
fi

# Fix each deployment
fixed=0
skipped=0

for deployment in $deployments; do
    # Get current image
    current_image=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null)
    
    if [ -z "$current_image" ]; then
        echo "⚠️  $deployment: No image found, skipping"
        ((skipped++))
        continue
    fi
    
    # Check if using wrong ACR
    if [[ $current_image == *"$WRONG_ACR"* ]]; then
        # Extract service name and tag
        service_name=$(echo $current_image | sed "s|$WRONG_ACR/||" | cut -d':' -f1)
        image_tag=$(echo $current_image | sed "s|$WRONG_ACR/||" | cut -d':' -f2)
        
        # Build new image URL
        new_image="$CORRECT_ACR/$service_name:latest"
        
        echo "📦 $deployment"
        echo "   Old: $current_image"
        echo "   New: $new_image"
        
        # Update deployment
        if kubectl set image deployment/$deployment $deployment=$new_image -n $NAMESPACE 2>/dev/null; then
            echo "   ✅ Updated successfully"
            ((fixed++))
        else
            echo "   ❌ Update failed"
        fi
        echo ""
    else
        if [[ $current_image == *"$CORRECT_ACR"* ]]; then
            echo "✅ $deployment: Already using correct ACR"
            ((skipped++))
        else
            echo "⚠️  $deployment: Using different ACR: $current_image"
            ((skipped++))
        fi
    fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Summary:"
echo "   ✅ Fixed: $fixed services"
echo "   ⏭️  Skipped: $skipped services"
echo ""
echo "🔄 Restarting deployments to pull new images..."
echo ""

# Restart deployments to force pull new images
for deployment in $deployments; do
    current_image=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null)
    if [[ $current_image == *"$CORRECT_ACR"* ]]; then
        echo "🔄 Restarting $deployment..."
        kubectl rollout restart deployment/$deployment -n $NAMESPACE 2>/dev/null
    fi
done

echo ""
echo "✅ Done! Services will now pull latest images from correct ACR."
echo ""
echo "💡 Monitor rollout status:"
echo "   kubectl rollout status deployment/<service-name> -n $NAMESPACE"

