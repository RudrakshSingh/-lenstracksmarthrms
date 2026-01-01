# Setup kubectl for Azure AKS

## 🔍 Current Issue

kubectl is trying to connect to `127.0.0.1:6443` (local cluster) which isn't running. You need to configure it to connect to your Azure AKS cluster.

---

## ✅ Quick Fix

### **Option 1: Connect to Azure AKS (Recommended)**

```bash
# Login to Azure (if not already)
az login

# Get your AKS cluster credentials
az aks get-credentials \
  --resource-group Etelios-AKS-RG \
  --name Etelios-AKS

# Verify connection
kubectl cluster-info
kubectl get nodes
```

### **Option 2: Check Existing Contexts**

```bash
# List all available contexts
kubectl config get-contexts

# Switch to your AKS context
kubectl config use-context <context-name>

# Verify
kubectl cluster-info
```

### **Option 3: If Using Different Cluster**

```bash
# List all contexts
kubectl config get-contexts

# Set current context
kubectl config use-context <your-cluster-context>

# Verify connection
kubectl get nodes
```

---

## 🔧 Detailed Steps

### **1. Check Current Context**

```bash
kubectl config current-context
kubectl config get-contexts
```

### **2. Connect to Azure AKS**

If your cluster is in Azure AKS:

```bash
# Install Azure CLI if not installed
# brew install azure-cli  # macOS
# or download from: https://aka.ms/InstallAzureCLI

# Login
az login

# List your AKS clusters
az aks list --output table

# Get credentials for your cluster
az aks get-credentials \
  --resource-group <your-resource-group> \
  --name <your-cluster-name>

# Verify
kubectl get nodes
```

### **3. For Other Cloud Providers**

**GKE (Google Cloud):**
```bash
gcloud container clusters get-credentials <cluster-name> --zone <zone>
```

**EKS (AWS):**
```bash
aws eks update-kubeconfig --name <cluster-name> --region <region>
```

---

## ✅ Verify Connection

After configuring, verify:

```bash
# Should show your cluster info (not connection refused)
kubectl cluster-info

# Should list your nodes
kubectl get nodes

# Should show namespaces
kubectl get namespaces
```

---

## 🚀 Once Connected, Install Istio

After kubectl is configured:

```bash
cd /Users/rudrakshsingh/Desktop/lenstracksmarthrms
./k8s/install-istio.sh
```

---

## 🔍 Troubleshooting

### **Issue: "connection refused"**

**Solution:** Configure kubectl to point to your actual cluster (see above)

### **Issue: "Unauthorized"**

**Solution:** 
```bash
# Re-authenticate
az login
az aks get-credentials --resource-group <RG> --name <cluster>
```

### **Issue: "context not found"**

**Solution:**
```bash
# List contexts
kubectl config get-contexts

# Use correct context
kubectl config use-context <context-name>
```

---

**Once kubectl is working, run: `./k8s/install-istio.sh`**

