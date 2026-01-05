# SSL Certificate Chain Issue Fix

## Problem

1. **curl Error**: `SSL certificate problem: unable to get local issuer certificate`
2. **Root Cause**: Kubernetes Ingress is using a **fake/self-signed certificate** instead of the real Sectigo certificate

## Current Status

From `openssl s_client` output:
```
Certificate chain
 0 s:O=Acme Co, CN=Kubernetes Ingress Controller Fake Certificate
```

This means:
- ❌ Real Sectigo certificate is NOT being used
- ❌ Kubernetes Ingress default fake certificate is active
- ❌ TLS secret `etelios-tls` either doesn't exist or isn't properly configured

## Solution

### Step 1: Create/Update TLS Secret in Kubernetes

The ingress expects a secret named `etelios-tls` with the certificate and key:

```bash
# Create TLS secret from certificate and key
kubectl create secret tls etelios-tls \
  --cert=ssl/production/cert.pem \
  --key=/path/to/private-key.pem \
  --namespace=etelios-backend-prod \
  --dry-run=client -o yaml | kubectl apply -f -

# Or if secret already exists, update it:
kubectl create secret tls etelios-tls \
  --cert=ssl/production/cert.pem \
  --key=/path/to/private-key.pem \
  --namespace=etelios-backend-prod \
  --save-config \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Step 2: Verify Secret Exists

```bash
# Check if secret exists
kubectl get secret etelios-tls -n etelios-backend-prod

# View secret details (won't show actual cert/key)
kubectl describe secret etelios-tls -n etelios-backend-prod
```

### Step 3: Verify Ingress is Using the Secret

```bash
# Check ingress configuration
kubectl get ingress etelios-ingress -n etelios-backend-prod -o yaml | grep -A 5 tls

# Should show:
# tls:
# - hosts:
#   - api.etelios.com
#   secretName: etelios-tls
```

### Step 4: Restart Ingress Controller (if needed)

```bash
# Restart nginx ingress controller to pick up new certificate
kubectl rollout restart deployment ingress-nginx-controller -n ingress-nginx

# Or if using different namespace:
kubectl rollout restart deployment ingress-nginx-controller -n kube-system
```

## Certificate Chain Issue

The Sectigo certificate needs the **intermediate certificate** in the chain. The certificate file should include:

1. **Server Certificate** (your cert.pem)
2. **Intermediate Certificate** (Sectigo Public Server Authentication CA DV R36)
3. **Root Certificate** (usually trusted by browsers, but may need to be included)

### Create Full Chain Certificate

```bash
# Download intermediate certificate from Sectigo
# Or combine certificates:
cat ssl/production/cert.pem ssl/production/intermediate.pem > ssl/production/fullchain.pem

# Use fullchain.pem in the secret:
kubectl create secret tls etelios-tls \
  --cert=ssl/production/fullchain.pem \
  --key=/path/to/private-key.pem \
  --namespace=etelios-backend-prod
```

## Quick Test (Skip Certificate Verification)

For testing only, use `-k` flag:

```bash
# Skip certificate verification (testing only)
curl -k https://api.etelios.com/
curl -k https://api.etelios.com/health
curl -k https://api.etelios.com/api/auth/login
```

## Next Steps

1. ✅ **Get Private Key**: Ensure you have the private key file
2. ✅ **Create TLS Secret**: Create/update `etelios-tls` secret in Kubernetes
3. ✅ **Verify Ingress**: Check ingress is using the secret
4. ✅ **Test**: Verify certificate is working

---

**Status**: Ingress is using fake certificate. Need to create TLS secret with real certificate.

