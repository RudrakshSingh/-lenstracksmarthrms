# Backend CSR (Certificate Signing Request) - Generated ✅

## 📋 CSR Information

**Generated Date:** $(date)
**Domain:** `*.etelios.com` (Wildcard)
**Root Domain:** `etelios.com`
**Key Size:** 2048 bits

---

## 📄 CSR Content

Copy this entire CSR content and submit it to Sectigo or your Certificate Authority:

```
-----BEGIN CERTIFICATE REQUEST-----
MIIDdDCCAlwCAQAwgaUxCzAJBgNVBAYTAklOMRQwEgYDVQQIDAtNYWhhcmFzaHRy
YTEPMA0GA1UEBwwGTXVtYmFpMR0wGwYDVQQKDBRFdGVsaW9zIFRlY2hub2xvZ2ll
czEWMBQGA1UECwwNSVQgRGVwYXJ0bWVudDEWMBQGA1UEAwwNKi5ldGVsaW9zLmNv
bTEgMB4GCSqGSIb3DQEJARYRYWRtaW5AZXRlbGlvcy5jb20wggEiMA0GCSqGSIb3
DQEBAQUAA4IBDwAwggEKAoIBAQDKS64bUr3ybFLmTy4eUef8hD8xiueJvcvBbZi/
Q1IgKOY/maNK5wRT+i/FhE9Lpzh7P5RQglfz1Y7FnIIIxMx1vOy1Kv9eqaRqyrtP
zOyBzHTjlSYovH2lJJgEreF3cJ8L8TAfNPz7L5jwSVlauLPCfLLkWRI6XRucQsAe
7T64IoXoMsjkCkDfwsWNSRMVrzL7sEkl7jnXDEclXXdfX8xsbeGUB+6zst5rrrEY
rGpkMfD7BwEfE4/3VLA7Ozv3dU31pzLIQuSW9TprGypJ2U7xWaOsGWOn4hq7/Czm
W3W2MlCEdtVKeshZuS6ubju3bJluarju1bOO6Tl8/Z/8KvmXAgMBAAGggYgwgYUG
CSqGSIb3DQEJDjF4MHYwCQYDVR0TBAIwADALBgNVHQ8EBAMCBeAwXAYDVR0RBFUw
U4INKi5ldGVsaW9zLmNvbYILZXRlbGlvcy5jb22CD2FwaS5ldGVsaW9zLmNvbYIP
d3d3LmV0ZWxpb3MuY29tghNiYWNrZW5kLmV0ZWxpb3MuY29tMA0GCSqGSIb3DQEB
CwUAA4IBAQCUVYSvyJt9waIMFI0EtRhpPs0e6DbRa1MxOb+37g9RkP61FiCqit27
Le9miB/O2PLKt6xyCjeVUfuOtIaFlximQ4bjHQKL7zIgiNLkqVbzq3MMKw0GKvHX
l0c6ifRIhJyTD8L/jFwJpNaXqzerVu28okj8bUYXGG/fzoejWHiZxebpMVFAYDST
EGtLIPAnx/ussyL/VuVpaRSPB1Kc6Cr/1jDfwuhOtNFLMdgJNuauv+mZao3kZ4b2
C1lWEUOuy6BMyEeKXhwvwuySUCtNVsHktiR3tc7Mr28rIrHQUEs1W9d4q3jHwbet
C7cEzbBfeu4V4Vlxm63Azv0OFo4+SvCh
-----END CERTIFICATE REQUEST-----
```

---

## 📁 Files Generated

1. **CSR File:** `ssl/production/etelios-backend.csr`
2. **Private Key:** `ssl/production/private/etelios-key.pem` ✅
3. **Config File:** `ssl/production/openssl-csr.conf`

---

## 🔐 CSR Details

**Subject Information:**
- **Country (C):** IN (India)
- **State (ST):** Maharashtra
- **City (L):** Mumbai
- **Organization (O):** Etelios Technologies
- **Organizational Unit (OU):** IT Department
- **Common Name (CN):** `*.etelios.com`
- **Email:** admin@etelios.com

**Subject Alternative Names (SAN):**
- `*.etelios.com` (Wildcard - सभी subdomains cover करता है)
- `etelios.com` (Root domain - Frontend के लिए)
- `api.etelios.com` (Backend API)
- `www.etelios.com` (WWW - Frontend के लिए)
- `backend.etelios.com` (Backend alternative)

## ✅ Frontend और Backend दोनों के लिए काम करेगा!

**यह CSR certificate frontend और backend दोनों के लिए perfect है:**

### Frontend Domains Covered:
- ✅ `etelios.com` (Root domain)
- ✅ `www.etelios.com` (WWW subdomain)
- ✅ `*.etelios.com` (Wildcard - कोई भी subdomain)

### Backend Domains Covered:
- ✅ `api.etelios.com` (Backend API)
- ✅ `backend.etelios.com` (Backend alternative)
- ✅ `*.etelios.com` (Wildcard - कोई भी subdomain)

**एक ही certificate से:**
- Frontend: `https://etelios.com` या `https://www.etelios.com`
- Backend: `https://api.etelios.com`
- दोनों secure HTTPS के साथ काम करेंगे!

---

## 📝 Next Steps

### Step 1: Submit CSR to Certificate Authority

1. **Sectigo Portal:**
   - Login to Sectigo account
   - Go to Certificate Management
   - Click "Request Certificate" or "Reissue Certificate"
   - Paste the CSR content (entire block from BEGIN to END)
   - Select validation method (DNS or Email)
   - Submit the request

2. **Other CA:**
   - Follow your CA's instructions
   - Paste the CSR content when prompted
   - Complete domain validation

### Step 2: Domain Validation

After submitting CSR, you'll need to validate domain ownership:

**DNS Validation (Recommended):**
- Add CNAME records to GoDaddy DNS
- Wait for validation (5-30 minutes)
- Certificate will be issued automatically

**Email Validation:**
- Check email at admin@etelios.com
- Click validation link
- Certificate will be issued

### Step 3: Download Certificate

Once certificate is issued:

1. Download the certificate from CA portal
2. Save it as: `ssl/production/etelios-cert.pem`
3. The private key is already saved at: `ssl/production/private/etelios-key.pem`

### Step 4: Configure Application

Update environment variables:

```bash
ENABLE_SSL=true
SSL_CERT_PATH=./ssl/production/etelios-cert.pem
SSL_KEY_PATH=./ssl/production/private/etelios-key.pem
```

---

## ⚠️ Important Security Notes

1. ✅ **Private Key is SECURE:**
   - Location: `ssl/production/private/etelios-key.pem`
   - Permissions: `600` (owner read/write only)
   - **NEVER share or commit to Git** (already in `.gitignore`)

2. ✅ **CSR is SAFE to share:**
   - CSR can be shared with Certificate Authority
   - CSR does not contain private key
   - It's safe to copy/paste in emails or portals

3. ✅ **After Certificate Issued:**
   - Certificate will work with the existing private key
   - No need to regenerate private key
   - Just save the certificate file

---

## 🔄 Regenerate CSR (if needed)

If you need to regenerate the CSR:

```bash
bash scripts/setup/generate-csr.sh
```

The script will:
- Use existing private key (if available)
- Or generate new private key
- Create new CSR with same configuration

---

## ✅ Verification

CSR has been verified and matches the private key:
- ✅ CSR format is valid
- ✅ Private key matches CSR
- ✅ All domains included in SAN
- ✅ Ready to submit to CA

---

## 📞 Support

If you need help:
1. Check CSR file: `ssl/production/etelios-backend.csr`
2. View CSR details: `openssl req -in ssl/production/etelios-backend.csr -text -noout`
3. Verify CSR: `openssl req -in ssl/production/etelios-backend.csr -noout -verify -key ssl/production/private/etelios-key.pem`

---

**Generated by:** `scripts/setup/generate-csr.sh`
**Date:** $(date)
