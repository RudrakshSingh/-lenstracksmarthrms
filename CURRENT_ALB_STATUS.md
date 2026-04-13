# 🔍 Current ALB Status - Which ALB is Active?

**Date:** March 10, 2026

---

## ✅ Currently Active ALB

Based on DNS and ingress configuration:

**Active ALB Hostname:**
```
k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
```

**DNS Configuration:**
- `api.etelios.com` → CNAME → `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com`

**Status:** ✅ Active and working with HTTPS

---

## 🔍 Check Current ALB

### Method 1: Check Ingress Status

```bash
kubectl get ingress etelios-ingress -n etelios-prod
```

**Output shows:**
```
NAME              CLASS   HOSTS             ADDRESS                                                                   PORTS   AGE
etelios-ingress   alb     api.etelios.com   k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com   80,443  26d
```

**ADDRESS field shows the active ALB hostname.**

### Method 2: Check DNS

```bash
nslookup api.etelios.com 8.8.8.8
```

**Shows which ALB hostname DNS is pointing to.**

### Method 3: Check Ingress Details

```bash
kubectl get ingress etelios-ingress -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' && echo
```

---

## 📋 All ALBs in AWS

If you have 2 ALBs in AWS, check which one is active:

### Step 1: List All ALBs

```bash
aws elbv2 describe-load-balancers \
  --region ap-south-1 \
  --query 'LoadBalancers[*].[LoadBalancerName,DNSName,State.Code]' \
  --output table
```

### Step 2: Check Which One is Used by Ingress

```bash
# Get ALB hostname from ingress
INGRESS_ALB=$(kubectl get ingress etelios-ingress -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

echo "Ingress is using: $INGRESS_ALB"
```

### Step 3: Match with AWS ALBs

Compare the hostname from ingress with the DNS names from AWS.

---

## 🎯 Current Configuration

**Active ALB:**
- **Hostname:** `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com`
- **Domain:** `api.etelios.com` (points to this ALB)
- **HTTPS:** ✅ Working (port 443)
- **HTTP:** ✅ Working (port 80)
- **SSL Certificate:** ✅ Attached

**Inactive ALB (if exists):**
- Check AWS Console for other ALBs
- These might be old/unused ALBs

---

## 🔍 Identify Which ALB is Active

### Quick Check Commands

```bash
# 1. Check ingress status
kubectl get ingress etelios-ingress -n etelios-prod

# 2. Check DNS
nslookup api.etelios.com 8.8.8.8

# 3. Test HTTPS (uses active ALB)
curl -I https://api.etelios.com/health --max-time 5
```

**All should point to the same ALB hostname.**

---

## 🚨 If You Have 2 ALBs

### Option 1: Keep Both (Different Purposes)
- One for backend APIs
- One for frontend or other services

### Option 2: Delete Unused ALB
If one ALB is not being used:
1. Verify it's not used by any ingress
2. Check if any DNS points to it
3. Delete from AWS Console (if safe)

### Option 3: Use Different ALBs for Different Services
- Configure multiple ingresses
- Each pointing to different ALB

---

## 📊 ALB Comparison

| ALB Hostname | Status | Used By | Purpose |
|-------------|--------|---------|---------|
| `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189...` | ✅ Active | `api.etelios.com` | Backend APIs |
| `[Other ALB]` | ❓ | Check | Unknown/Unused |

---

## ✅ Verification

Run these commands to confirm which ALB is active:

```bash
# 1. Get ALB from ingress
echo "Ingress ALB:"
kubectl get ingress etelios-ingress -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' && echo

# 2. Get ALB from DNS
echo "DNS ALB:"
nslookup api.etelios.com 8.8.8.8 | grep "canonical name"

# 3. List all ALBs in AWS
echo "All ALBs in AWS:"
aws elbv2 describe-load-balancers \
  --region ap-south-1 \
  --query 'LoadBalancers[*].DNSName' \
  --output table
```

**All should show the same ALB hostname if configuration is correct.**

---

## 🎯 Summary

**Currently Active ALB:**
```
k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
```

**Used by:**
- Kubernetes Ingress: `etelios-ingress`
- DNS: `api.etelios.com`
- SSL Certificate: Attached
- Status: ✅ Fully operational

---

**Run the verification commands to see which ALB is currently active!**
