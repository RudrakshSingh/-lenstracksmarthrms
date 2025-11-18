#!/bin/bash

# AKS Deployment Script for Etelios Microservices
# Usage: ./deploy.sh [environment] [service-name]

set -e

ENVIRONMENT="${1:-production}"
SERVICE="${2:-all}"
NAMESPACE="etelios"
ACR_NAME="${ACR_NAME:-eteliosacr}"
AKS_RESOURCE_GROUP="${AKS_RESOURCE_GROUP:-Etelios-rg}"
AKS_CLUSTER_NAME="${AKS_CLUSTER_NAME:-etelios-aks}"

echo "🚀 Deploying to AKS..."
echo "Environment: ${ENVIRONMENT}"
echo "Service: ${SERVICE}"
echo "Namespace: ${NAMESPACE}"
echo "ACR: ${ACR_NAME}"
echo "Cluster: ${AKS_CLUSTER_NAME}"

# Check if kubectl is configured
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ kubectl is not configured. Please configure it first:"
    echo "   az aks get-credentials --resource-group ${AKS_RESOURCE_GROUP} --name ${AKS_CLUSTER_NAME}"
    exit 1
fi

# Create namespace if it doesn't exist
echo "📦 Creating namespace..."
kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# Apply ConfigMap
echo "⚙️  Applying ConfigMap..."
kubectl apply -f k8s/configmap.yaml

# Apply Secrets (if exists)
if [ -f "k8s/secrets.yaml" ]; then
    echo "🔐 Applying Secrets..."
    kubectl apply -f k8s/secrets.yaml
else
    echo "⚠️  Warning: k8s/secrets.yaml not found. Please create it from k8s/secrets.yaml.template"
fi

# Generate manifests if needed
if [ ! -d "k8s/deployments" ]; then
    echo "📝 Generating manifests..."
    chmod +x k8s/generate-manifests.sh
    ./k8s/generate-manifests.sh
fi

# Deploy services
if [ "$SERVICE" == "all" ]; then
    echo "🚀 Deploying all services..."
    kubectl apply -f k8s/api-gateway.yaml
    kubectl apply -f k8s/deployments/
else
    echo "🚀 Deploying ${SERVICE}..."
    if [ -f "k8s/deployments/${SERVICE}.yaml" ]; then
        kubectl apply -f "k8s/deployments/${SERVICE}.yaml"
    else
        echo "❌ Service manifest not found: k8s/deployments/${SERVICE}.yaml"
        exit 1
    fi
fi

# Apply Ingress
echo "🌐 Applying Ingress..."
kubectl apply -f k8s/ingress.yaml

# Wait for deployments
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment --all -n ${NAMESPACE} || true

# Show status
echo "📊 Deployment Status:"
kubectl get deployments -n ${NAMESPACE}
kubectl get services -n ${NAMESPACE}
kubectl get ingress -n ${NAMESPACE}

echo "✅ Deployment complete!"

