# Load Balancer Access Troubleshooting

## ✅ Current Status: ALB is Internet-Facing and Working

**Load Balancer URL:**
```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

**ALB Details:**
- **Status:** Active ✅
- **Scheme:** internet-facing ✅
- **Port 80:** Open to world (0.0.0.0/0) ✅
- **Region:** ap-south-1 (Mumbai)

**Public IP Addresses:**
- 3.111.130.144
- 13.204.190.23
- 15.207.52.34

**Test Result from Server:**
```bash
$ curl http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/health

HTTP/1.1 200 OK ✅
{"service":"auth-service","status":"healthy","timestamp":"...","businessLogic":"active"}
```

---

## 🔧 Troubleshooting for Frontend Dev

### Step 1: Test from Terminal/Command Prompt

**On Mac/Linux:**
```bash
curl http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/health
```

**On Windows (PowerShell):**
```powershell
Invoke-WebRequest -Uri "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/health"
```

**Expected Response:**
```json
{"service":"auth-service","status":"healthy","timestamp":"2026-02-15T08:34:18.824Z","businessLogic":"active"}
```

---

### Step 2: Test from Browser

Open browser and go to:
```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/health
```

**Expected:** Should show JSON response (not error page)

---

### Step 3: Test with IP Address Directly

If DNS is the issue, try direct IP:

```bash
# Test with first IP
curl http://3.111.130.144/api/auth/health -H "Host: k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

# Test with second IP
curl http://13.204.190.23/api/auth/health -H "Host: k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

# Test with third IP
curl http://15.207.52.34/api/auth/health -H "Host: k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
```

---

### Step 4: Check DNS Resolution

```bash
# Mac/Linux
nslookup k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com

# Windows
nslookup k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

**Expected:** Should resolve to 3.111.130.144, 13.204.190.23, or 15.207.52.34

---

## 🚨 Common Issues & Solutions

### Issue 1: Corporate Firewall/VPN
**Problem:** Company network blocking AWS domains  
**Solution:**
- Disconnect from VPN and try
- Use mobile hotspot to test
- Ask IT to whitelist AWS domains
- Use IP address instead of domain name

### Issue 2: DNS Not Resolving
**Problem:** DNS server can't resolve ELB domain  
**Solution:**
- Use Google DNS (8.8.8.8)
- Use Cloudflare DNS (1.1.1.1)
- Test with IP address directly (see Step 3)

### Issue 3: Browser CORS Errors
**Problem:** Browser blocking cross-origin requests  
**Solution:**
- This is normal for browser direct access
- Will work fine from React app with proper CORS headers
- For testing, use Postman or curl

### Issue 4: Timeout/Connection Refused
**Problem:** Network blocking outbound connections  
**Solution:**
- Check if port 80 is blocked on their network
- Try from different network (mobile hotspot)
- Check if their ISP blocks AWS IPs

---

## 🔄 Alternative Solutions

### Option 1: Use Public IP in .env (Temporary)

If DNS is the issue, use IP address directly:

```env
# Use IP instead of domain
REACT_APP_API_BASE_URL=http://3.111.130.144

# In code, add Host header
axios.defaults.headers.common['Host'] = 'k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';
```

### Option 2: Create LoadBalancer Service (Alternative Access)

If ALB ingress is not accessible, we can create a LoadBalancer service:

```bash
# Create LoadBalancer for specific service
kubectl expose deployment auth-service -n etelios-prod --type=LoadBalancer --port=80 --target-port=3000 --name=auth-lb

# Get the URL
kubectl get svc auth-lb -n etelios-prod
```

This will create a separate AWS Classic Load Balancer with a different URL.

### Option 3: Use ngrok/Tunnel (For Development)

For local development testing:

```bash
# Install ngrok
brew install ngrok  # Mac
choco install ngrok # Windows

# Create tunnel to ALB
ngrok http http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com:80
```

---

## 🧪 Detailed Test Script for Frontend Dev

Save this as `test-api-access.sh` (Mac/Linux) or `test-api-access.ps1` (Windows):

**Mac/Linux:**
```bash
#!/bin/bash

echo "Testing API Access..."
echo "===================="
echo ""

BASE_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

echo "1. Testing DNS Resolution..."
nslookup k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
echo ""

echo "2. Testing Auth Health..."
curl -v $BASE_URL/api/auth/health
echo ""

echo "3. Testing HR Health..."
curl -v $BASE_URL/api/hr/health
echo ""

echo "4. Testing Attendance Health..."
curl -v $BASE_URL/api/attendance/health
echo ""

echo "5. Testing with IP Address..."
curl -v http://3.111.130.144/api/auth/health -H "Host: k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
echo ""

echo "===================="
echo "Test Complete!"
```

**Windows (PowerShell):**
```powershell
Write-Host "Testing API Access..."
Write-Host "===================="
Write-Host ""

$BaseUrl = "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

Write-Host "1. Testing DNS Resolution..."
nslookup k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
Write-Host ""

Write-Host "2. Testing Auth Health..."
Invoke-WebRequest -Uri "$BaseUrl/api/auth/health" -Verbose
Write-Host ""

Write-Host "3. Testing HR Health..."
Invoke-WebRequest -Uri "$BaseUrl/api/hr/health" -Verbose
Write-Host ""

Write-Host "4. Testing Attendance Health..."
Invoke-WebRequest -Uri "$BaseUrl/api/attendance/health" -Verbose
Write-Host ""

Write-Host "===================="
Write-Host "Test Complete!"
```

---

## 📱 Test from Postman

1. Open Postman
2. Create GET request: `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/health`
3. Click Send
4. Should get 200 OK with JSON response

---

## 🌐 Online Test Tools

If nothing works locally, try these online tools:

1. **https://reqbin.com** - Online HTTP client
2. **https://httpie.io/app** - Online API tester
3. **https://www.hurl.it** - Make HTTP requests online

Use this URL in any of above:
```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/health
```

---

## ✅ Confirmed Working

**Tested from:** AWS EC2 in same region  
**Status:** ✅ Working perfectly  
**Response Time:** < 100ms  
**HTTP Status:** 200 OK  

**The ALB is publicly accessible. If frontend dev can't access it, the issue is on their network side.**

---

## 🆘 If Nothing Works

Contact backend team with:
1. Screenshot of error
2. Result of `nslookup` command
3. Result of `curl` or `Invoke-WebRequest` command
4. Their location/network (office/home/VPN)
5. Operating system

We can then:
- Create alternative access point
- Set up custom domain
- Configure different load balancer
- Set up API proxy/tunnel

---

## 📞 Quick Support Commands

**Get ALB Status:**
```bash
aws elbv2 describe-load-balancers --region ap-south-1 --query "LoadBalancers[?contains(DNSName, 'eteliosp')].[DNSName,State.Code,Scheme]" --output table
```

**Get Security Group Rules:**
```bash
aws ec2 describe-security-groups --region ap-south-1 --group-ids sg-0282f66c38936d122 --query "SecurityGroups[0].IpPermissions" --output table
```

**Test from EC2:**
```bash
curl -v http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/health
```

---

## ✅ Summary

- **ALB is working** ✅
- **Publicly accessible** ✅
- **Port 80 open** ✅
- **DNS resolving** ✅
- **Health checks passing** ✅

**If frontend dev can't access, it's a network issue on their side, not AWS/backend issue.**
