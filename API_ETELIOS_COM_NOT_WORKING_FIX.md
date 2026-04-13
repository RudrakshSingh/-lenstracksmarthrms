# 🚨 api.etelios.com Not Working - Fix Guide

**Issue:** `api.etelios.com` DNS not resolving

**Error:** `Could not resolve host: api.etelios.com`

---

## 🔍 Immediate Diagnosis

### Step 1: Check DNS Resolution

```bash
nslookup api.etelios.com
```

**If fails:** DNS not configured or changed

### Step 2: Check with Google DNS

```bash
nslookup api.etelios.com 8.8.8.8
```

### Step 3: Test Direct ALB

```bash
curl -I http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/health --max-time 10
```

**If this works:** DNS issue  
**If this fails:** ALB/service issue

---

## 🚨 Most Likely Issue: DNS Changed or Deleted

### Check GoDaddy DNS

1. **Go to GoDaddy:**
   - Login → My Products → etelios.com → DNS

2. **Check for `api` record:**
   - Should have CNAME record
   - Name: `api`
   - Value: `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com`

3. **If record missing or wrong:**
   - Delete old record
   - Add new CNAME record:
     - Type: CNAME
     - Name: `api`
     - Value: `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com`
     - TTL: 600

---

## ✅ Quick Fix Steps

### Option 1: Re-add DNS Record in GoDaddy

1. GoDaddy → DNS Management
2. Delete any existing `api` record
3. Add new CNAME:
   - Name: `api`
   - Value: `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com`
4. Save
5. Wait 5-15 minutes

### Option 2: Check Ingress Status

```bash
kubectl get ingress etelios-ingress -n etelios-prod
```

**Verify ADDRESS shows correct ALB hostname**

### Option 3: Check ALB Status

```bash
aws elbv2 describe-load-balancers \
  --region ap-south-1 \
  --query 'LoadBalancers[?contains(DNSName, `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189`)].{Name:LoadBalancerName,DNS:DNSName,State:State.Code}' \
  --output table
```

**Verify ALB is active**

---

## 🔍 Complete Diagnosis Commands

```bash
# 1. Check DNS
nslookup api.etelios.com
nslookup api.etelios.com 8.8.8.8

# 2. Test direct ALB
curl -I http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/health --max-time 10

# 3. Check ingress
kubectl get ingress etelios-ingress -n etelios-prod

# 4. Check ALB
aws elbv2 describe-load-balancers --region ap-south-1 --query 'LoadBalancers[?contains(DNSName, `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189`)].DNSName' --output text

# 5. Check services
kubectl get svc -n etelios-prod | grep -E "auth-service|hr-service"
```

---

## 🎯 Most Common Causes

1. **DNS record deleted/changed in GoDaddy** - Most likely
2. **DNS propagation delay** - Wait 15-30 minutes
3. **ALB deleted** - Check AWS Console
4. **Ingress misconfigured** - Check ingress status
5. **Services down** - Check pod status

---

## ✅ Expected DNS Record

**In GoDaddy DNS:**
```
Type: CNAME
Name: api
Value: k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
TTL: 600
```

---

## 🚀 Quick Fix

**If DNS is missing:**

1. GoDaddy में जाएं
2. DNS Management खोलें
3. `api` CNAME record add करें
4. Value: `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com`
5. Save करें
6. 10-15 minutes wait करें

---

**Run these commands to diagnose:**
1. `nslookup api.etelios.com 8.8.8.8`
2. `curl -I http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/health --max-time 10`
3. `kubectl get ingress etelios-ingress -n etelios-prod`
