# 🔍 ALB Access Diagnosis

**Date:** 2026-02-28  
**Issue:** ALB connection failing (HTTP Status: 000)

---

## ❌ Problem

Frontend se backend access nahi ho raha - ALB connection failing.

**Symptoms:**
- HTTP Status: 000 (Connection failed)
- Timeout errors
- No response from ALB

---

## 🔍 Possible Causes

### 1. **Network Connectivity**
- Local machine se ALB tak network issue
- Firewall blocking outbound connections
- VPN required for access

### 2. **Security Groups**
- ALB security group not allowing traffic from your IP
- Inbound rules missing for HTTP/HTTPS

### 3. **ALB Configuration**
- ALB not publicly accessible
- Internal ALB (requires VPN/bastion)
- Listener configuration issue

### 4. **DNS/Route53**
- DNS not resolving correctly
- Domain not pointing to ALB

---

## ✅ Verification Steps

### Step 1: Check DNS Resolution
```bash
nslookup k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

### Step 2: Test HTTPS
```bash
curl -k https://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/health
```

### Step 3: Test Domain
```bash
curl -k https://api.etelios.com/health
```

### Step 4: Check Security Groups
```bash
# Get ALB security group
aws elbv2 describe-load-balancers --names <alb-name> --query 'LoadBalancers[0].SecurityGroups'

# Check security group rules
aws ec2 describe-security-groups --group-ids <sg-id>
```

### Step 5: Verify Services (Port-Forward)
```bash
kubectl port-forward -n etelios-prod svc/auth-service 3001:3001
curl http://localhost:3001/health
```

---

## 🔧 Solutions

### Solution 1: Update Security Groups
If ALB security group is blocking:
```bash
# Allow HTTP from anywhere (or specific IPs)
aws ec2 authorize-security-group-ingress \
  --group-id <alb-sg-id> \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# Allow HTTPS from anywhere (or specific IPs)
aws ec2 authorize-security-group-ingress \
  --group-id <alb-sg-id> \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

### Solution 2: Check ALB Scheme
```bash
aws elbv2 describe-load-balancers \
  --query 'LoadBalancers[?LoadBalancerName==`<name>`].[Scheme,State.Code]'
```

Should be:
- **Scheme:** `internet-facing` (for public access)
- **State:** `active`

### Solution 3: Use VPN/Bastion
If ALB is internal, use:
- AWS VPN
- Bastion host
- Direct service access via port-forward

### Solution 4: Test from AWS
```bash
# SSH into EC2 instance in same VPC
# Then test ALB from there
curl http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/health
```

---

## 📊 Current Status

- **Services:** ✅ Running (verified via port-forward)
- **Ingress:** ✅ Configured
- **ALB:** ⚠️ Connection failing from local machine
- **DNS:** ✅ Resolving

---

## 🎯 Next Steps

1. **Check Security Groups** - Verify ALB allows inbound traffic
2. **Verify ALB Scheme** - Should be `internet-facing`
3. **Test from AWS** - Test from EC2 instance in same VPC
4. **Use Port-Forward** - For immediate testing while fixing ALB access

---

**Last Updated:** 2026-02-28
