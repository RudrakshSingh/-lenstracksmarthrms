# AWS Certificate Manager (ACM) SSL Setup with GoDaddy DNS

This guide explains how to get CNAME records from AWS Certificate Manager and configure them in GoDaddy for SSL certificate validation.

---

## 📋 Overview

When you request an SSL certificate in AWS Certificate Manager (ACM), AWS needs to verify that you own the domain. This is done by adding CNAME records to your DNS provider (GoDaddy).

**Process:**
1. Request certificate in AWS Certificate Manager
2. Get CNAME records from ACM
3. Add CNAME records to GoDaddy DNS
4. Wait for validation (5-30 minutes)
5. Certificate is issued automatically

---

## 🔐 Step 1: Request Certificate in AWS Certificate Manager

### 1.1 Navigate to Certificate Manager

1. Login to [AWS Console](https://console.aws.amazon.com)
2. Go to **Certificate Manager** service
   - Search for "Certificate Manager" in the services search bar
   - Or navigate: **Services** → **Security, Identity, & Compliance** → **Certificate Manager**

### 1.2 Request a Certificate

1. Click **"Request a certificate"** button
2. Select **"Request a public certificate"**
3. Click **"Next"**

### 1.3 Enter Domain Names

Enter your domain names:

**For single domain:**
```
api.etelios.com
```

**For multiple domains (recommended):**
```
etelios.com
*.etelios.com
```

**Note:** 
- `*.etelios.com` is a wildcard that covers all subdomains (api.etelios.com, www.etelios.com, etc.)
- You can add multiple domains in one certificate

### 1.4 Choose Validation Method

1. Select **"DNS validation"** (recommended)
   - ✅ Easier than email validation
   - ✅ Works for wildcard certificates
   - ✅ No email access needed

2. Click **"Request"**

---

## 📝 Step 2: Get CNAME Records from AWS

After requesting the certificate, AWS will show you the CNAME records needed for validation.

### 2.1 View Certificate Details

1. In Certificate Manager, click on your certificate
2. You'll see the certificate status: **"Pending validation"**

### 2.2 Get CNAME Records

1. Scroll down to **"Domains"** section
2. For each domain, you'll see:
   - **Domain name** (e.g., `etelios.com`)
   - **Validation status** (Pending)
   - **CNAME record name** (e.g., `_abc123.etelios.com`)
   - **CNAME record value** (e.g., `_xyz789.acm-validations.aws.`)

**Example CNAME Records:**

| Domain | CNAME Name | CNAME Value |
|--------|------------|-------------|
| `etelios.com` | `_abc123def456.etelios.com` | `_xyz789.acm-validations.aws.` |
| `*.etelios.com` | `_abc123def456.etelios.com` | `_xyz789.acm-validations.aws.` |

**Important Notes:**
- Each domain/subdomain gets its own unique CNAME record
- The CNAME name starts with an underscore `_`
- The CNAME value ends with a dot `.` (include it!)
- Copy these exactly as shown

---

## 🌐 Step 3: Add CNAME Records to GoDaddy

### 3.1 Login to GoDaddy

1. Go to [https://www.godaddy.com](https://www.godaddy.com)
2. Login with your account
3. Go to **"My Products"**

### 3.2 Access DNS Management

1. Find your domain (e.g., `etelios.com`)
2. Click **"DNS"** button (or "Manage DNS")
3. Scroll to **"Records"** section

### 3.3 Add CNAME Records

For each CNAME record from AWS:

1. Click **"Add"** button
2. Select type: **CNAME**
3. **Name:** Enter the CNAME name from AWS
   - Example: `_abc123def456`
   - **Important:** Don't include the domain name, just the prefix
   - GoDaddy automatically adds `.etelios.com`
4. **Value:** Enter the CNAME value from AWS
   - Example: `_xyz789.acm-validations.aws.`
   - **Important:** Include the trailing dot `.` if AWS shows it
5. **TTL:** Leave default (600 seconds) or set to 600
6. Click **"Save"**

### 3.4 Example: Adding Records

**If AWS shows:**
```
CNAME Name: _abc123def456.etelios.com
CNAME Value: _xyz789.acm-validations.aws.
```

**In GoDaddy, enter:**
- **Name:** `_abc123def456`
- **Value:** `_xyz789.acm-validations.aws.`
- **TTL:** `600`

**Result:** GoDaddy creates `_abc123def456.etelios.com` → `_xyz789.acm-validations.aws.`

---

## ⏱️ Step 4: Wait for Validation

1. **DNS Propagation:** 5-30 minutes
   - GoDaddy DNS changes take time to propagate
   - AWS checks DNS records periodically

2. **Certificate Validation:** 5-30 minutes after DNS propagates
   - AWS automatically validates the CNAME records
   - Certificate status changes from "Pending validation" to "Issued"

3. **Check Status:**
   - Go back to AWS Certificate Manager
   - Refresh the certificate page
   - Status should show **"Issued"** (green checkmark)

---

## ✅ Step 5: Verify CNAME Records

You can verify the CNAME records are working:

### 5.1 Using Command Line

```bash
# Check CNAME record
dig _abc123def456.etelios.com CNAME

# Or using nslookup
nslookup -type=CNAME _abc123def456.etelios.com

# Should return: _xyz789.acm-validations.aws.
```

### 5.2 Using Online Tools

- [MXToolbox](https://mxtoolbox.com/CNAMELookup.aspx)
- [DNS Checker](https://dnschecker.org/)

Enter the CNAME name (e.g., `_abc123def456.etelios.com`) and verify it points to the AWS validation server.

---

## 🔗 Step 6: Attach Certificate to Load Balancer

Once the certificate is issued:

### 6.1 Get Certificate ARN

1. In Certificate Manager, click on your certificate
2. Copy the **Certificate ARN** (e.g., `arn:aws:acm:ap-south-1:123456789012:certificate/abc-123-def-456`)

### 6.2 Attach to ALB

**Option A: Via AWS Console (ALB)**

1. Go to **EC2** → **Load Balancers**
2. Select your ALB
3. Go to **Listeners** tab
4. Click **"Edit"** on HTTPS listener (port 443)
5. Select your certificate from the dropdown
6. Click **"Save"**

**Option B: Via Kubernetes Ingress**

Update your ingress configuration to use the certificate:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  annotations:
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:ap-south-1:123456789012:certificate/abc-123-def-456
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: '443'
spec:
  ingressClassName: alb
  rules:
  - host: api.etelios.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 80
```

---

## 🚨 Troubleshooting

### Issue: Certificate Still Pending After 30 Minutes

**Possible Causes:**
1. **CNAME record not added correctly**
   - Check spelling of CNAME name and value
   - Ensure trailing dot `.` is included if AWS shows it
   - Verify in GoDaddy DNS records list

2. **DNS not propagated**
   - Wait longer (can take up to 48 hours in rare cases)
   - Check DNS propagation: `dig _abc123def456.etelios.com CNAME`

3. **Wrong domain in CNAME name**
   - Ensure CNAME name matches exactly what AWS shows
   - For `_abc123.etelios.com`, GoDaddy name should be `_abc123`

**Solution:**
```bash
# Verify CNAME exists
dig _abc123def456.etelios.com CNAME

# If not found, re-check GoDaddy DNS settings
# Re-enter CNAME record exactly as AWS shows
```

### Issue: Certificate Shows "Validation Failed"

**Possible Causes:**
1. CNAME value is incorrect
2. CNAME name is incorrect
3. DNS propagation not complete

**Solution:**
1. Delete the CNAME record in GoDaddy
2. Re-add it exactly as AWS shows
3. Wait 15-30 minutes
4. AWS will re-validate automatically

### Issue: Can't Find Certificate in ALB Dropdown

**Possible Causes:**
1. Certificate is in different AWS region
2. Certificate is not in the same account

**Solution:**
- Ensure certificate is in the **same AWS region** as your ALB
- For `ap-south-1` ALB, certificate must be in `ap-south-1` region

---

## 📊 Quick Reference

### AWS Certificate Manager Regions

**Important:** Certificate must be in the same region as your ALB!

- **Mumbai (ap-south-1):** For ALB in Mumbai
- **US East (us-east-1):** For CloudFront (if using)

### CNAME Record Format

```
Name:  _abc123def456.etelios.com
Type:  CNAME
Value: _xyz789.acm-validations.aws.
TTL:   600
```

### Certificate Status Flow

```
Requested → Pending validation → Issued ✅
                ↓
         (Add CNAME to GoDaddy)
                ↓
         (Wait 5-30 minutes)
                ↓
            Issued ✅
```

---

## 🎯 Summary Checklist

- [ ] Request certificate in AWS Certificate Manager
- [ ] Copy CNAME records from AWS (name and value)
- [ ] Add CNAME records to GoDaddy DNS
- [ ] Verify CNAME records with `dig` or online tools
- [ ] Wait for certificate validation (5-30 minutes)
- [ ] Verify certificate status is "Issued" in AWS
- [ ] Attach certificate to ALB or update Kubernetes ingress
- [ ] Test HTTPS: `curl https://api.etelios.com/health`

---

## 📞 Need Help?

**Common Questions:**

**Q: How many CNAME records do I need?**  
A: One CNAME record per domain/subdomain. If you requested `etelios.com` and `*.etelios.com`, you'll get 2 CNAME records.

**Q: Do I need to include the trailing dot?**  
A: Yes, if AWS shows a trailing dot `.` in the CNAME value, include it in GoDaddy.

**Q: How long does validation take?**  
A: Usually 5-30 minutes after DNS propagates. Can take up to 48 hours in rare cases.

**Q: Can I use the same certificate for multiple subdomains?**  
A: Yes, if you request a wildcard certificate `*.etelios.com`, it covers all subdomains.

---

**Last Updated:** 2026-03-05  
**Domain:** etelios.com  
**AWS Region:** ap-south-1 (Mumbai)
