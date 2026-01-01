# Quick Fix: kubectl Connection Issue

## 🔍 Current Situation

You have **Docker Desktop** Kubernetes context, but the cluster isn't running.

---

## ✅ Solution Options

### **Option 1: Start Docker Desktop Kubernetes**

1. Open **Docker Desktop**
2. Go to **Settings** → **Kubernetes**
3. Enable **"Enable Kubernetes"**
4. Click **"Apply & Restart"**
5. Wait for Kubernetes to start (green indicator)

Then verify:
```bash
kubectl cluster-info
kubectl get nodes
```

---

### **Option 2: Connect to Azure AKS (Recommended for Production)**

If you want to use your Azure AKS cluster instead:

```bash
# Login to Azure
az login

# Connect to your AKS cluster
az aks get-credentials \
  --resource-group Etelios-AKS-RG \
  --name Etelios-AKS

# Verify
kubectl cluster-info
kubectl get nodes
```

---

## 🚀 After Fixing Connection

Once kubectl is working, install Istio:

```bash
cd /Users/rudrakshsingh/Desktop/lenstracksmarthrms
./k8s/install-istio.sh
```

---

## 📝 Quick Commands

```bash
# Check current context
kubectl config current-context

# List all contexts
kubectl config get-contexts

# Switch context (if you have AKS)
kubectl config use-context <aks-context-name>

# Test connection
kubectl cluster-info
```

---

**Choose one option above, then run the Istio installation script.**

