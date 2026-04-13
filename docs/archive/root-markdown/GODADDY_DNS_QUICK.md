# GoDaddy DNS - Quick Setup

## What to Add in GoDaddy

मान लें domain है: `etelios.com`

### Go to GoDaddy → My Products → DNS → Add Record

**Add this CNAME:**

```
Type:      CNAME
Name:      api
Points to: a0adb495fa82c42bfafa50a3552b78dd-1883230600.ap-south-1.elb.amazonaws.com
TTL:       600 seconds
```

**Save करें**

### Result

5-30 minutes में:
- `api.etelios.com` → Your Auth Service
- All APIs accessible via this domain

### Test

```bash
# Wait 10-30 minutes, then test
nslookup api.etelios.com

# Test health
curl http://api.etelios.com/health
```

### Update Frontend

```bash
REACT_APP_API_URL=http://api.etelios.com
```

Done! 🎉

---

## ⚠️ First Fix DocumentDB

**IMPORTANT:** पहले pods को running करें (DocumentDB connectivity fix), फिर DNS setup करें.

Run:
```bash
./check-and-fix-all-security-groups.sh
```

Pods running होने के बाद GoDaddy DNS add करें.
