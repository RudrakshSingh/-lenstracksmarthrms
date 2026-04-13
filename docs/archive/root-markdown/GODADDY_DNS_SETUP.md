# GoDaddy DNS Setup for Etelios on AWS

## 🌐 Your Current LoadBalancer URLs

**Auth Service:**
```
a0adb495fa82c42bfafa50a3552b78dd-1883230600.ap-south-1.elb.amazonaws.com
```

**HR Service:**
```
a92564b536d23459880ac316b0bf9062-849640911.ap-south-1.elb.amazonaws.com
```

---

## 📋 GoDaddy DNS Records to Add

मान लें आपका domain है: `etelios.com`

### Option 1: Single API Subdomain (Recommended)

GoDaddy में जाएं और ये records add करें:

| Type  | Name    | Value                                                                   | TTL  |
|-------|---------|-------------------------------------------------------------------------|------|
| CNAME | api     | a0adb495fa82c42bfafa50a3552b78dd-1883230600.ap-south-1.elb.amazonaws.com | 600  |
| CNAME | www     | a0adb495fa82c42bfafa50a3552b78dd-1883230600.ap-south-1.elb.amazonaws.com | 600  |

**Result:**
- `api.etelios.com` → Auth Service (all APIs)
- `www.etelios.com` → Frontend/Auth

### Option 2: Separate Subdomains for Each Service

| Type  | Name       | Value                                                                   | TTL  |
|-------|------------|-------------------------------------------------------------------------|------|
| CNAME | auth       | a0adb495fa82c42bfafa50a3552b78dd-1883230600.ap-south-1.elb.amazonaws.com | 600  |
| CNAME | hr         | a92564b536d23459880ac316b0bf9062-849640911.ap-south-1.elb.amazonaws.com | 600  |
| CNAME | api        | a0adb495fa82c42bfafa50a3552b78dd-1883230600.ap-south-1.elb.amazonaws.com | 600  |

**Result:**
- `auth.etelios.com` → Auth Service
- `hr.etelios.com` → HR Service
- `api.etelios.com` → All APIs

---

## 🔧 Step-by-Step GoDaddy Setup

### Step 1: Login to GoDaddy
1. Go to https://www.godaddy.com
2. Login with your account
3. Go to "My Products"

### Step 2: Manage DNS
1. Find your domain (e.g., etelios.com)
2. Click "DNS" button
3. Scroll to "Records" section

### Step 3: Add CNAME Record for API
1. Click "Add" button
2. Select type: **CNAME**
3. Name: **api**
4. Value: **a0adb495fa82c42bfafa50a3552b78dd-1883230600.ap-south-1.elb.amazonaws.com**
5. TTL: **600 seconds** (or default)
6. Click "Save"

### Step 4: Add CNAME for HR (Optional)
1. Click "Add" again
2. Type: **CNAME**
3. Name: **hr**
4. Value: **a92564b536d23459880ac316b0bf9062-849640911.ap-south-1.elb.amazonaws.com**
5. TTL: **600**
6. Save

### Step 5: Verify
DNS changes take 5-30 minutes to propagate.

Check with:
```bash
# Check if DNS is working
nslookup api.etelios.com

# Should return the LoadBalancer address
```

---

## 🧪 Test After DNS Setup

Once DNS propagates (5-30 minutes):

```bash
# Test with your domain
curl http://api.etelios.com/health

# Test login
curl -X POST http://api.etelios.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -H 'X-Tenant-Id: default' \
  -d '{"emailOrEmployeeId": "user@example.com", "password": "password"}'
```

---

## 🔐 SSL Certificate (HTTPS) - Next Step

After DNS works, setup SSL:

### Option 1: AWS Certificate Manager (Free)
1. Go to AWS Console → Certificate Manager
2. Request certificate for:
   - `etelios.com`
   - `*.etelios.com` (wildcard)
3. Validate via DNS (add CNAME records GoDaddy में)
4. Certificate issued (5-30 minutes)
5. Attach to LoadBalancer

### Option 2: Let's Encrypt (Free, via cert-manager)
```bash
# Install cert-manager in Kubernetes
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Configure Let's Encrypt issuer
# Certificate automatically generated
```

---

## 📱 Frontend Environment Variables

After DNS setup, update frontend:

```bash
# Development
REACT_APP_API_URL=http://api.etelios.com
REACT_APP_AUTH_API=http://api.etelios.com/api/auth
REACT_APP_HR_API=http://hr.etelios.com/api/hr

# Production (after SSL)
REACT_APP_API_URL=https://api.etelios.com
REACT_APP_AUTH_API=https://api.etelios.com/api/auth
```

---

## ⏱️ Timeline

- **DNS Setup:** 5 minutes
- **DNS Propagation:** 5-30 minutes
- **SSL Certificate:** 30-60 minutes
- **Total:** 40-95 minutes

---

## 💡 Quick Summary for GoDaddy

**Just add this:**

```
Type: CNAME
Name: api
Points to: a0adb495fa82c42bfafa50a3552b78dd-1883230600.ap-south-1.elb.amazonaws.com
TTL: 600
```

Done! `api.etelios.com` will work in 5-30 minutes.

---

## 🚨 Current Status

**Important:** DocumentDB connectivity issue अभी fix होना है. DNS setup करने से पहले:

1. Run: `./check-and-fix-all-security-groups.sh` (pods को DocumentDB connect करने के लिए)
2. फिर GoDaddy में DNS setup करें
3. Services accessible होंगी

DNS setup बाद में भी कर सकते हैं — पहले pods को running करना important है!
