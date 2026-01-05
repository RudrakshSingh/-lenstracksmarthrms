# SSL Certificate Issue Fix

## Problem
- **SSL Error**: `curl: (60) SSL certificate problem: unable to get local issuer certificate`
- **Fake Certificate**: Server is using "Kubernetes Ingress Controller Fake Certificate"
- **Root Cause**: The `etelios-tls` secret either doesn't exist or has a fake/default certificate

## Current Status

### ✅ Working
- `/health` endpoint works (with `-k` flag)
- Routing is configured correctly

### ❌ Issues
1. **Root path** (`/`) returns "Route not found" - auth-service code not deployed
2. **SSL Certificate** is fake - needs real certificate from Sectigo

## Solutions

### Option 1: Use cert-manager (Recommended)
The ingress is configured to use cert-manager:
```yaml
cert-manager.io/cluster-issuer: "letsencrypt-prod"
```

**Steps**:
1. Ensure cert-manager is installed
2. Ensure ClusterIssuer `letsencrypt-prod` exists
3. cert-manager will automatically create the `etelios-tls` secret

**Check cert-manager**:
```bash
kubectl get clusterissuer letsencrypt-prod
kubectl get certificate -n etelios-backend-prod
kubectl describe certificate -n etelios-backend-prod
```

### Option 2: Manual TLS Secret Creation
Use the production certificate from `ssl/production/cert.pem`:

```bash
# Run the script
chmod +x k8s/create-tls-secret.sh
./k8s/create-tls-secret.sh
```

**Requirements**:
- Certificate file: `ssl/production/cert.pem` ✅ (exists)
- Private key file: `ssl/production/key.pem` ❌ (needs to be provided)

### Option 3: Use Existing Certificate
If you have the certificate and key:

```bash
kubectl create secret tls etelios-tls \
  --cert=ssl/production/cert.pem \
  --key=/path/to/private-key.pem \
  --namespace=etelios-backend-prod \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Certificate Chain Issue

The error "unable to get local issuer certificate" means:
- Certificate chain is incomplete (missing intermediate CA)
- Need to include intermediate certificates in the certificate file

**Fix**: Combine certificate with intermediate CA:
```bash
cat ssl/production/cert.pem ssl/production/intermediate.pem > ssl/production/fullchain.pem
```

Then use `fullchain.pem` instead of `cert.pem`.

## Testing

### With SSL verification bypass (for testing):
```bash
curl -k https://api.etelios.com/
curl -k https://api.etelios.com/health
```

### With proper SSL (after fix):
```bash
curl https://api.etelios.com/
curl https://api.etelios.com/health
```

## Next Steps

1. ✅ **Check cert-manager**: Verify if it's managing certificates
2. ⏳ **Create TLS secret**: Use production certificate
3. ⏳ **Deploy auth-service**: Update with root path handler
4. ⏳ **Test**: Verify SSL works properly

---

**Status**: Certificate needs to be properly configured in Kubernetes secret.

