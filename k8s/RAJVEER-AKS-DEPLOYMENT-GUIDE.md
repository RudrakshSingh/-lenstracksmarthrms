# AKS Deployment Guide for Rajveer

## Complete Step-by-Step Guide to Deploy Etelios Microservices on Azure Kubernetes Service (AKS)

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Creating AKS Cluster](#creating-aks-cluster)
4. [Configuring Secrets](#configuring-secrets)
5. [Building and Pushing Docker Images](#building-and-pushing-docker-images)
6. [Deploying to AKS](#deploying-to-aks)
7. [Verification and Testing](#verification-and-testing)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance and Updates](#maintenance-and-updates)

---

## Prerequisites

### Required Tools

Before starting, ensure you have the following installed:

1. **Azure CLI** (v2.50.0 or later)
   ```bash
   # Check if installed
   az --version
   
   # If not installed, install via:
   # macOS: brew install azure-cli
   # Linux: curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   # Windows: Download from https://aka.ms/installazurecliwindows
   ```

2. **kubectl** (Kubernetes command-line tool)
   ```bash
   # Check if installed
   kubectl version --client
   
   # If not installed:
   # macOS: brew install kubectl
   # Linux: curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
   # Windows: Download from https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/
   ```

3. **Docker** (for building images)
   ```bash
   # Check if installed
   docker --version
   
   # If not installed, download from: https://www.docker.com/products/docker-desktop
   ```

4. **Helm** (for installing NGINX Ingress)
   ```bash
   # Check if installed
   helm version
   
   # If not installed:
   # macOS: brew install helm
   # Linux: curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
   # Windows: Download from https://helm.sh/docs/intro/install/
   ```

5. **Git** (for cloning repository)
   ```bash
   # Check if installed
   git --version
   ```

### Azure Account Requirements

- **Azure Subscription** with Owner or Contributor role
- **Resource Group** permissions (or create new one)
- **ACR (Azure Container Registry)** permissions
- **AKS** permissions

### Required Information

Before starting, gather:
- Azure Subscription ID
- Resource Group name (or create new: `Etelios-rg`)
- ACR name (or create new: `eteliosacr`)
- AKS cluster name (or create new: `etelios-aks`)
- MongoDB connection strings
- Redis connection strings
- JWT secrets
- Other service credentials

---

## Initial Setup

### Step 1: Login to Azure

```bash
# Login to Azure
az login

# If you have multiple subscriptions, select the correct one
az account list --output table
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Verify current subscription
az account show
```

### Step 2: Clone Repository (if not already done)

```bash
# Navigate to your workspace
cd /path/to/your/workspace

# Clone the repository (if needed)
git clone <repository-url>
cd lenstracksmarthrms
```

### Step 3: Set Environment Variables

```bash
# Set these variables (adjust as needed)
export RESOURCE_GROUP="Etelios-rg"
export LOCATION="centralindia"
export ACR_NAME="eteliosacr"
export AKS_CLUSTER_NAME="etelios-aks"
export NAMESPACE="etelios"
```

---

## Creating AKS Cluster

### Option A: Automated Setup (Recommended)

We have a script that does everything automatically:

```bash
# Navigate to project root
cd /path/to/lenstracksmarthrms

# Make script executable
chmod +x k8s/setup-aks.sh

# Run the setup script
./k8s/setup-aks.sh
```

This script will:
1. Create resource group
2. Create Azure Container Registry (ACR)
3. Create AKS cluster
4. Configure kubectl
5. Install NGINX Ingress Controller

**Time**: ~15-20 minutes

### Option B: Manual Setup

If you prefer manual setup or need more control:

#### Step 1: Create Resource Group

```bash
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

#### Step 2: Create Azure Container Registry (ACR)

```bash
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true
```

**Note**: ACR name must be globally unique (lowercase, alphanumeric only).

#### Step 3: Create AKS Cluster

```bash
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_CLUSTER_NAME \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --enable-addons monitoring \
  --enable-managed-identity \
  --attach-acr $ACR_NAME \
  --generate-ssh-keys
```

**Parameters Explained**:
- `--node-count 3`: 3 worker nodes
- `--node-vm-size Standard_D4s_v3`: 4 vCPU, 16GB RAM per node
- `--enable-addons monitoring`: Azure Monitor integration
- `--attach-acr $ACR_NAME`: Allows AKS to pull images from ACR
- `--generate-ssh-keys`: Generates SSH keys for node access

**Time**: ~10-15 minutes

#### Step 4: Get AKS Credentials

```bash
az aks get-credentials \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_CLUSTER_NAME \
  --overwrite-existing
```

#### Step 5: Verify Connection

```bash
# Test kubectl connection
kubectl cluster-info

# View nodes
kubectl get nodes

# Should show 3 nodes in Ready state
```

#### Step 6: Install NGINX Ingress Controller

```bash
# Add NGINX Ingress Helm repository
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Create namespace for ingress
kubectl create namespace ingress-nginx

# Install NGINX Ingress Controller
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz \
  --set controller.replicaCount=2

# Wait for installation (2-3 minutes)
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=300s

# Get ingress IP
kubectl get service ingress-nginx-controller -n ingress-nginx
```

**Note**: The EXTERNAL-IP will be shown (may take a few minutes to assign).

---

## Configuring Secrets

### Step 1: Create Secrets File

```bash
# Navigate to project root
cd /path/to/lenstracksmarthrms

# Make script executable
chmod +x k8s/setup-secrets.sh

# Run interactive secret setup
./k8s/setup-secrets.sh
```

The script will prompt you for:
- JWT Secret
- JWT Refresh Secret
- MongoDB URIs (for auth, hr, and common services)
- Redis password (if required)
- Email configuration
- Encryption keys
- Cloud storage credentials
- SMS (Twilio) credentials

### Step 2: Manual Secret Creation (Alternative)

If you prefer to create secrets manually:

```bash
# Copy template
cp k8s/secrets.yaml.template k8s/secrets.yaml

# Edit the file
nano k8s/secrets.yaml  # or use your preferred editor
```

**Important**: All values in `secrets.yaml` must be base64 encoded.

To encode a value:
```bash
# Example: Encoding JWT secret
echo -n "your-jwt-secret-here" | base64
# Output: eW91ci1qd3Qtc2VjcmV0LWhlcmU=

# Example: Encoding MongoDB URI
echo -n "mongodb+srv://user:pass@cluster.mongodb.net/dbname" | base64
```

### Step 3: Apply Secrets to Kubernetes

```bash
# Create namespace first (if not exists)
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Apply secrets
kubectl apply -f k8s/secrets.yaml

# Verify secrets are created
kubectl get secrets -n $NAMESPACE
kubectl describe secret etelios-secrets -n $NAMESPACE
```

---

## Building and Pushing Docker Images

### Step 1: Login to ACR

```bash
# Login to ACR
az acr login --name $ACR_NAME

# Verify login
az acr repository list --name $ACR_NAME
```

### Step 2: Build and Push Images

We have a script that builds and pushes all images:

```bash
# Make script executable
chmod +x k8s/build-and-push.sh

# Build and push all services
./k8s/build-and-push.sh all latest

# This will take 20-30 minutes for all services
```

### Step 3: Build Individual Service (Optional)

If you need to build a specific service:

```bash
# Build and push specific service
./k8s/build-and-push.sh auth-service latest

# Or manually:
docker build -t $ACR_NAME.azurecr.io/auth-service:latest \
  -f microservices/auth-service/Dockerfile \
  microservices/auth-service/

docker push $ACR_NAME.azurecr.io/auth-service:latest
```

### Step 4: Verify Images in ACR

```bash
# List all repositories
az acr repository list --name $ACR_NAME --output table

# List tags for a specific repository
az acr repository show-tags --name $ACR_NAME \
  --repository auth-service --output table

# Should show 'latest' tag
```

---

## Deploying to AKS

### Step 1: Generate Kubernetes Manifests

```bash
# Make script executable
chmod +x k8s/generate-manifests.sh

# Generate all manifests
./k8s/generate-manifests.sh

# This creates manifests in k8s/deployments/
```

### Step 2: Review Configuration

Before deploying, review these files:

```bash
# Check ConfigMap
cat k8s/configmap.yaml

# Verify service URLs are correct
# Update if needed
```

### Step 3: Deploy Everything

```bash
# Make deploy script executable
chmod +x k8s/deploy.sh

# Deploy all services
./k8s/deploy.sh production all
```

This script will:
1. Create namespace
2. Apply ConfigMap
3. Apply Secrets
4. Deploy API Gateway
5. Deploy all microservices
6. Apply Ingress
7. Wait for deployments to be ready

**Time**: ~5-10 minutes

### Step 4: Deploy Individual Service (Optional)

```bash
# Deploy specific service
./k8s/deploy.sh production auth-service

# Or manually:
kubectl apply -f k8s/deployments/auth-service.yaml
```

---

## Verification and Testing

### Step 1: Check Deployment Status

```bash
# Check all pods
kubectl get pods -n $NAMESPACE

# Should show all pods in Running state
# Example output:
# NAME                            READY   STATUS    RESTARTS   AGE
# api-gateway-7d8f9c4b5-abc12     1/1     Running   0          2m
# auth-service-6d7e8f9a-def34     1/1     Running   0          2m
# hr-service-5c6d7e8f-ghi56       1/1     Running   0          2m
# ...

# Check deployments
kubectl get deployments -n $NAMESPACE

# Check services
kubectl get services -n $NAMESPACE

# Check ingress
kubectl get ingress -n $NAMESPACE
```

### Step 2: Check Pod Logs

```bash
# View logs for a specific pod
kubectl logs -f deployment/api-gateway -n $NAMESPACE

# View logs for all pods of a service
kubectl logs -f -l app=auth-service -n $NAMESPACE

# View logs for a specific pod (if you know pod name)
kubectl logs <pod-name> -n $NAMESPACE
```

### Step 3: Get Ingress IP

```bash
# Get ingress IP address
kubectl get ingress etelios-ingress -n $NAMESPACE

# Or get from ingress-nginx service
kubectl get service ingress-nginx-controller -n ingress-nginx

# Note the EXTERNAL-IP
```

### Step 4: Test Endpoints

```bash
# Get the ingress IP
INGRESS_IP=$(kubectl get service ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test API Gateway health
curl http://$INGRESS_IP/health

# Test API Gateway root
curl http://$INGRESS_IP/

# Test Auth service health (via Gateway)
curl http://$INGRESS_IP/api/auth/health

# Test HR service health (via Gateway)
curl http://$INGRESS_IP/api/hr/health
```

### Step 5: Port Forwarding (For Testing)

If you need to test services directly without ingress:

```bash
# Port forward to API Gateway
kubectl port-forward -n $NAMESPACE service/api-gateway 3000:3000

# In another terminal, test locally
curl http://localhost:3000/health

# Port forward to Auth service
kubectl port-forward -n $NAMESPACE service/auth-service 3001:3001

# Test locally
curl http://localhost:3001/health
```

### Step 6: Check Resource Usage

```bash
# View resource usage
kubectl top nodes
kubectl top pods -n $NAMESPACE

# Describe a pod for detailed info
kubectl describe pod <pod-name> -n $NAMESPACE
```

---

## Troubleshooting

### Problem: Pods Not Starting

**Symptoms**: Pods stuck in `Pending`, `CrashLoopBackOff`, or `Error` state

**Solutions**:

```bash
# Check pod status
kubectl get pods -n $NAMESPACE

# Describe pod to see events
kubectl describe pod <pod-name> -n $NAMESPACE

# Check logs
kubectl logs <pod-name> -n $NAMESPACE

# Common issues:
# 1. Image pull errors - Check ACR permissions
# 2. Resource limits - Check node capacity
# 3. Configuration errors - Check ConfigMap/Secrets
```

### Problem: Image Pull Errors

**Symptoms**: `ErrImagePull` or `ImagePullBackOff`

**Solutions**:

```bash
# Verify ACR is attached to AKS
az aks show --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER_NAME \
  --query "servicePrincipalProfile" -o table

# Re-attach ACR if needed
az aks update --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER_NAME \
  --attach-acr $ACR_NAME

# Verify image exists in ACR
az acr repository show-tags --name $ACR_NAME \
  --repository auth-service --output table

# Check ACR admin credentials
az acr credential show --name $ACR_NAME
```

### Problem: Services Not Accessible

**Symptoms**: 404 or connection refused errors

**Solutions**:

```bash
# Check service endpoints
kubectl get endpoints -n $NAMESPACE

# Check if pods are ready
kubectl get pods -n $NAMESPACE

# Test service from within cluster
kubectl run -it --rm debug --image=busybox --restart=Never -- sh
# Inside pod:
wget -O- http://auth-service:3001/health

# Check ingress
kubectl describe ingress etelios-ingress -n $NAMESPACE

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

### Problem: High Memory/CPU Usage

**Symptoms**: Pods being killed or slow performance

**Solutions**:

```bash
# Check resource usage
kubectl top pods -n $NAMESPACE

# Scale up a service
kubectl scale deployment auth-service --replicas=3 -n $NAMESPACE

# Increase resource limits in manifest
# Edit k8s/deployments/auth-service.yaml
# Update resources.requests and resources.limits
# Then apply: kubectl apply -f k8s/deployments/auth-service.yaml
```

### Problem: Secrets Not Working

**Symptoms**: Services can't connect to databases or external services

**Solutions**:

```bash
# Verify secrets exist
kubectl get secrets -n $NAMESPACE

# Check secret values (base64 encoded)
kubectl get secret etelios-secrets -n $NAMESPACE -o yaml

# Decode a value to verify
kubectl get secret etelios-secrets -n $NAMESPACE \
  -o jsonpath='{.data.jwt-secret}' | base64 -d

# Re-apply secrets if needed
kubectl apply -f k8s/secrets.yaml

# Restart pods to pick up new secrets
kubectl rollout restart deployment -n $NAMESPACE
```

### Problem: Ingress Not Working

**Symptoms**: Can't access services via ingress IP

**Solutions**:

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller

# Verify ingress is configured
kubectl get ingress -n $NAMESPACE
kubectl describe ingress etelios-ingress -n $NAMESPACE

# Check ingress IP
kubectl get service ingress-nginx-controller -n ingress-nginx

# Test ingress from within cluster
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl http://api-gateway.etelios.svc.cluster.local:3000/health
```

---

## Maintenance and Updates

### Updating a Service

```bash
# 1. Build new image
./k8s/build-and-push.sh auth-service v1.2.0

# 2. Update deployment manifest (if needed)
# Edit k8s/deployments/auth-service.yaml
# Change image tag if not using 'latest'

# 3. Apply updated manifest
kubectl apply -f k8s/deployments/auth-service.yaml

# 4. Watch rollout
kubectl rollout status deployment/auth-service -n $NAMESPACE

# 5. Rollback if needed
kubectl rollout undo deployment/auth-service -n $NAMESPACE
```

### Scaling Services

```bash
# Scale a specific service
kubectl scale deployment auth-service --replicas=5 -n $NAMESPACE

# Scale all services
kubectl scale deployment --replicas=3 --all -n $NAMESPACE

# Check current replicas
kubectl get deployments -n $NAMESPACE
```

### Viewing Logs

```bash
# Real-time logs for a deployment
kubectl logs -f deployment/auth-service -n $NAMESPACE

# Logs for all pods of a service
kubectl logs -f -l app=auth-service -n $NAMESPACE

# Logs from previous container (if pod crashed)
kubectl logs <pod-name> -n $NAMESPACE --previous

# Export logs to file
kubectl logs deployment/auth-service -n $NAMESPACE > auth-service.log
```

### Monitoring

```bash
# View cluster events
kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp'

# View resource usage
kubectl top nodes
kubectl top pods -n $NAMESPACE

# View pod details
kubectl describe pod <pod-name> -n $NAMESPACE
```

### Backup and Restore

```bash
# Export all resources
kubectl get all -n $NAMESPACE -o yaml > backup.yaml

# Export ConfigMap
kubectl get configmap etelios-config -n $NAMESPACE -o yaml > configmap-backup.yaml

# Export Secrets (be careful - contains sensitive data)
kubectl get secret etelios-secrets -n $NAMESPACE -o yaml > secrets-backup.yaml
```

---

## Common Commands Reference

### Cluster Management

```bash
# Get cluster info
kubectl cluster-info

# Get nodes
kubectl get nodes

# Get all resources in namespace
kubectl get all -n $NAMESPACE

# Get all resources across all namespaces
kubectl get all --all-namespaces
```

### Pod Management

```bash
# List pods
kubectl get pods -n $NAMESPACE

# Describe pod
kubectl describe pod <pod-name> -n $NAMESPACE

# Delete pod (will be recreated by deployment)
kubectl delete pod <pod-name> -n $NAMESPACE

# Exec into pod
kubectl exec -it <pod-name> -n $NAMESPACE -- sh
```

### Service Management

```bash
# List services
kubectl get services -n $NAMESPACE

# Describe service
kubectl describe service <service-name> -n $NAMESPACE

# Port forward
kubectl port-forward -n $NAMESPACE service/<service-name> <local-port>:<service-port>
```

### Deployment Management

```bash
# List deployments
kubectl get deployments -n $NAMESPACE

# Describe deployment
kubectl describe deployment <deployment-name> -n $NAMESPACE

# Scale deployment
kubectl scale deployment <deployment-name> --replicas=<count> -n $NAMESPACE

# Restart deployment
kubectl rollout restart deployment <deployment-name> -n $NAMESPACE

# View rollout history
kubectl rollout history deployment <deployment-name> -n $NAMESPACE

# Rollback to previous version
kubectl rollout undo deployment <deployment-name> -n $NAMESPACE
```

### Debugging

```bash
# Run debug pod
kubectl run -it --rm debug --image=busybox --restart=Never -- sh

# Run curl pod
kubectl run -it --rm curl --image=curlimages/curl --restart=Never -- sh

# View events
kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp'

# View resource usage
kubectl top pods -n $NAMESPACE
kubectl top nodes
```

---

## Quick Reference: Complete Deployment Flow

```bash
# 1. Login to Azure
az login
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# 2. Set variables
export RESOURCE_GROUP="Etelios-rg"
export LOCATION="centralindia"
export ACR_NAME="eteliosacr"
export AKS_CLUSTER_NAME="etelios-aks"
export NAMESPACE="etelios"

# 3. Setup AKS
./k8s/setup-aks.sh

# 4. Configure secrets
./k8s/setup-secrets.sh

# 5. Build and push images
./k8s/build-and-push.sh all latest

# 6. Generate manifests
./k8s/generate-manifests.sh

# 7. Deploy
./k8s/deploy.sh production all

# 8. Verify
kubectl get pods -n $NAMESPACE
kubectl get services -n $NAMESPACE
kubectl get ingress -n $NAMESPACE

# 9. Get ingress IP
kubectl get service ingress-nginx-controller -n ingress-nginx

# 10. Test
curl http://<INGRESS_IP>/health
```

---

## Support and Resources

### Documentation
- **AKS Documentation**: https://docs.microsoft.com/en-us/azure/aks/
- **Kubernetes Documentation**: https://kubernetes.io/docs/
- **NGINX Ingress**: https://kubernetes.github.io/ingress-nginx/

### Useful Links
- **Azure Portal**: https://portal.azure.com
- **Azure CLI Reference**: https://docs.microsoft.com/en-us/cli/azure/
- **kubectl Cheat Sheet**: https://kubernetes.io/docs/reference/kubectl/cheatsheet/

### Getting Help

If you encounter issues:
1. Check the logs: `kubectl logs <pod-name> -n $NAMESPACE`
2. Describe the resource: `kubectl describe <resource> <name> -n $NAMESPACE`
3. Check events: `kubectl get events -n $NAMESPACE`
4. Review this guide's troubleshooting section
5. Contact the development team

---

## Checklist: Before Going Live

- [ ] All pods are running and healthy
- [ ] All services are accessible
- [ ] Ingress is configured and working
- [ ] SSL/TLS certificates are configured (if using HTTPS)
- [ ] DNS is pointing to ingress IP
- [ ] Secrets are properly configured
- [ ] Monitoring is set up
- [ ] Logging is configured
- [ ] Backup strategy is in place
- [ ] Disaster recovery plan is documented
- [ ] Team has access to cluster
- [ ] Documentation is up to date

---

**Last Updated**: [Current Date]
**Prepared For**: Rajveer
**Status**: Ready for Production Deployment

