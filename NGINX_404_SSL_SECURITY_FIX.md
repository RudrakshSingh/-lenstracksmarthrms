# Nginx 404 & SSL Security Issue Fix

## Problem

1. **404 Error**: Accessing `https://98.70.245.87` returns 404 from nginx
2. **"Not Secure" Warning**: Browser shows "Not Secure" because:
   - TLS certificate is for `api.etelios.com` domain
   - Accessing via IP `98.70.245.87` doesn't match certificate
   - Certificate mismatch causes browser security warning

## Root Cause

The Kubernetes Ingress is configured with:
- **TLS**: Only for `api.etelios.com` domain
- **Rules**: 
  - Rule 1: `api.etelios.com` (with TLS) ✅
  - Rule 2: No host (for IP access) ❌ **No TLS configured**

When accessing via IP:
- Browser tries HTTPS but certificate doesn't match IP
- Ingress may not have proper routing for IP access
- Results in 404 error

## Solutions

### Option 1: Use Domain Name (Recommended)
Access via domain name instead of IP:
```
https://api.etelios.com/api/auth/register
```

**Benefits**:
- ✅ TLS certificate matches
- ✅ Browser shows "Secure"
- ✅ Proper routing configured

### Option 2: Configure IP Access with TLS
Add TLS configuration for IP access (requires IP-based certificate or wildcard):

```yaml
spec:
  tls:
  - hosts:
    - api.etelios.com
    - 98.70.245.87  # Add IP (requires IP certificate)
    secretName: etelios-tls
```

**Note**: This requires a certificate that includes the IP address, which is uncommon.

### Option 3: Add Default Backend for IP Access
Ensure the "no host" rule properly routes requests:

```yaml
# Rule 2: Without host (for direct IP access)
- http:
    paths:
    - path: /
      pathType: Prefix
      backend:
        service:
          name: default-backend
          port:
            number: 80
    # ... existing paths
```

### Option 4: Use HTTP for IP Access
Access via HTTP (port 80) for IP access:
```
http://98.70.245.87/api/auth/register
```

**Note**: HTTP is not secure, but will work for testing.

## Current Ingress Configuration

The ingress has:
- ✅ TLS for `api.etelios.com`
- ✅ Routing rules for domain access
- ⚠️ Routing rules for IP access (but no TLS)

## Recommended Fix

**Use domain name for production access**:
1. Point `api.etelios.com` DNS to `98.70.245.87`
2. Access via: `https://api.etelios.com`
3. Browser will show "Secure" ✅

## Certificate Status

- **Certificate**: Valid for `*.etelios.com` and `etelios.com`
- **Issuer**: Sectigo Public Server Authentication CA DV R36
- **Valid Until**: January 2, 2027
- **Status**: ✅ Valid, but only for domain names, not IPs

## Quick Test

```bash
# Test with domain (should work)
curl -k https://api.etelios.com/api/auth/login

# Test with IP (may show 404 or certificate error)
curl -k https://98.70.245.87/api/auth/login
```

## Next Steps

1. ✅ **Verify DNS**: Ensure `api.etelios.com` points to `98.70.245.87`
2. ✅ **Use Domain**: Access via `https://api.etelios.com` instead of IP
3. ⚠️ **If IP Required**: Configure proper routing and accept certificate warning

---

**Status**: Ingress configured correctly for domain access. IP access requires additional configuration.

