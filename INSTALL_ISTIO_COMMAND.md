# Install Istio - Quick Command

## Single Command (Copy & Paste)

```bash
export PATH="$HOME/istio/istio-1.28.2/bin:$PATH" && istioctl install --set profile=minimal --set values.defaultRevision=default -y
```

---

## Step-by-Step (If Above Doesn't Work)

### 1. Set PATH
```bash
export PATH="$HOME/istio/istio-1.28.2/bin:$PATH"
```

### 2. Verify istioctl works
```bash
istioctl version
```

### 3. Uninstall existing (if needed)
```bash
istioctl uninstall --purge -y
kubectl delete namespace istio-system --ignore-not-found=true
```

### 4. Install with minimal profile
```bash
istioctl install --set profile=minimal --set values.defaultRevision=default -y
```

### 5. Verify installation
```bash
kubectl get pods -n istio-system
```

---

## Why Minimal Profile?

- Uses less CPU/memory (suitable for smaller clusters)
- Faster installation
- Can add components later if needed

---

## After Installation

```bash
# Check status
kubectl get pods -n istio-system

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=istiod -n istio-system --timeout=300s
```

