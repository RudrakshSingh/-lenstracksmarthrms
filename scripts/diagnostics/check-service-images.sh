#!/bin/bash

# Script to check if all services are using latest images
# Checks AKS deployments for image versions

NAMESPACE="etelios-backend-prod"
ACR_NAME="eteliosacr-hvawabdbgge7e0fu.azurecr.io"

echo "🔍 Checking Service Images in Production"
echo "=========================================="
echo ""
echo "Namespace: $NAMESPACE"
echo "ACR: $ACR_NAME"
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

echo "📊 Service Image Status:"
echo ""

# Get all deployments
deployments=$(kubectl get deployments -n $NAMESPACE -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' 2>/dev/null)

if [ -z "$deployments" ]; then
    echo "❌ No deployments found in namespace $NAMESPACE"
    exit 1
fi

# Check each deployment
for deployment in $deployments; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 $deployment"
    echo ""
    
    # Get image
    image=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null)
    
    if [ -z "$image" ]; then
        echo "   ❌ No image found"
        continue
    fi
    
    echo "   Image: $image"
    
    # Check if using ACR
    if [[ $image == *"$ACR_NAME"* ]]; then
        echo "   ✅ Using correct ACR: $ACR_NAME"
        
        # Extract image name and tag
        image_name=$(echo $image | sed "s|$ACR_NAME/||" | cut -d':' -f1)
        image_tag=$(echo $image | sed "s|$ACR_NAME/||" | cut -d':' -f2)
        
        echo "   Image Name: $image_name"
        echo "   Tag: $image_tag"
        
        # Check if using latest tag
        if [ "$image_tag" = "latest" ]; then
            echo "   ✅ Using 'latest' tag"
        else
            echo "   ⚠️  Using specific tag: $image_tag"
        fi
    else
        echo "   ⚠️  Not using expected ACR ($ACR_NAME)"
    fi
    
    # Get pod status
    pods=$(kubectl get pods -n $NAMESPACE -l app=$deployment -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.phase}{"\t"}{.status.containerStatuses[0].image}{"\n"}{end}' 2>/dev/null)
    
    if [ -n "$pods" ]; then
        echo ""
        echo "   Pods:"
        echo "$pods" | while IFS=$'\t' read -r pod_name phase pod_image; do
            if [ "$phase" = "Running" ]; then
                echo "      ✅ $pod_name: $phase"
            elif [ "$phase" = "Pending" ] || [ "$phase" = "ContainerCreating" ]; then
                echo "      ⏳ $pod_name: $phase"
            else
                echo "      ❌ $pod_name: $phase"
            fi
        done
    fi
    
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Summary:"
echo "   Check above to see if all services are using latest images"
echo "   Services using 'latest' tag will automatically pull new images"
echo "   Services with specific tags need manual update"
echo ""

