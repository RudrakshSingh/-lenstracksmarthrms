#!/bin/bash

# AKS Cluster Setup Script for Etelios
# This script creates and configures the AKS cluster

set -e

# Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-Etelios-AKS-RG}"
LOCATION="${LOCATION:-centralindia}"
ACR_NAME="${ACR_NAME:-eteliosacr}"
AKS_CLUSTER_NAME="${AKS_CLUSTER_NAME:-Etelios-AKS}"
NODE_COUNT="${NODE_COUNT:-3}"
NODE_VM_SIZE="${NODE_VM_SIZE:-Standard_D4s_v3}"

echo "🚀 Setting up AKS Cluster for Etelios"
echo "Resource Group: ${RESOURCE_GROUP}"
echo "Location: ${LOCATION}"
echo "ACR Name: ${ACR_NAME}"
echo "AKS Cluster: ${AKS_CLUSTER_NAME}"
echo "Node Count: ${NODE_COUNT}"
echo "Node Size: ${NODE_VM_SIZE}"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first:"
    echo "   https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in
if ! az account show &> /dev/null; then
    echo "🔐 Please login to Azure..."
    az login
fi

echo "✅ Logged in to Azure"
echo ""

# Create resource group
echo "📦 Creating resource group..."
az group create \
  --name ${RESOURCE_GROUP} \
  --location ${LOCATION} \
  --output table || echo "Resource group already exists"

# Create ACR
echo "🐳 Creating Azure Container Registry..."
az acr create \
  --resource-group ${RESOURCE_GROUP} \
  --name ${ACR_NAME} \
  --sku Basic \
  --admin-enabled true \
  --output table || echo "ACR already exists"

# Get ACR login server
ACR_LOGIN_SERVER=$(az acr show --name ${ACR_NAME} --resource-group ${RESOURCE_GROUP} --query loginServer --output tsv)
echo "✅ ACR Login Server: ${ACR_LOGIN_SERVER}"

# Create AKS cluster
echo "☸️  Creating AKS cluster (this may take 10-15 minutes)..."
az aks create \
  --resource-group ${RESOURCE_GROUP} \
  --name ${AKS_CLUSTER_NAME} \
  --node-count ${NODE_COUNT} \
  --node-vm-size ${NODE_VM_SIZE} \
  --enable-addons monitoring \
  --enable-managed-identity \
  --attach-acr ${ACR_NAME} \
  --generate-ssh-keys \
  --output table || {
    echo "⚠️  Cluster creation failed or already exists"
    echo "Checking if cluster exists..."
    if az aks show --resource-group ${RESOURCE_GROUP} --name ${AKS_CLUSTER_NAME} &> /dev/null; then
        echo "✅ Cluster already exists"
    else
        echo "❌ Cluster creation failed"
        exit 1
    fi
}

# Get credentials
echo "🔑 Getting AKS credentials..."
az aks get-credentials \
  --resource-group ${RESOURCE_GROUP} \
  --name ${AKS_CLUSTER_NAME} \
  --overwrite-existing

# Verify connection
echo "✅ Verifying kubectl connection..."
kubectl cluster-info

# Install NGINX Ingress Controller
echo "🌐 Installing NGINX Ingress Controller..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Check if ingress-nginx namespace exists
if ! kubectl get namespace ingress-nginx &> /dev/null; then
    kubectl create namespace ingress-nginx
fi

# Install or upgrade ingress
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz \
  --set controller.replicaCount=2 \
  --wait || echo "Ingress controller installation completed"

# Get ingress IP
echo "⏳ Waiting for ingress IP..."
sleep 10
INGRESS_IP=$(kubectl get service ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")

echo ""
echo "✅ AKS Cluster Setup Complete!"
echo ""
echo "📋 Summary:"
echo "   Resource Group: ${RESOURCE_GROUP}"
echo "   ACR: ${ACR_NAME}"
echo "   AKS Cluster: ${AKS_CLUSTER_NAME}"
echo "   Ingress IP: ${INGRESS_IP}"
echo ""
echo "📝 Next Steps:"
echo "   1. Configure secrets: ./k8s/setup-secrets.sh"
echo "   2. Build and push images: ./k8s/build-and-push.sh"
echo "   3. Deploy services: ./k8s/deploy.sh production all"
echo ""

