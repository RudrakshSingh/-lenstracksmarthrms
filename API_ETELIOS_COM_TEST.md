# 🔍 api.etelios.com Test & Diagnosis

**Date:** March 10, 2026

---

## 🧪 Test Commands

### Test 1: DNS Resolution

```bash
nslookup api.etelios.com
```

### Test 2: HTTP Connection

```bash
curl -I http://api.etelios.com/health --max-time 10
```

### Test 3: HTTPS Connection

```bash
curl -I https://api.etelios.com/health --max-time 10
```

### Test 4: Direct ALB Test

```bash
curl -I http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/health --max-time 10
```

### Test 5: Verbose HTTPS Test

```bash
curl -v https://api.etelios.com/health --max-time 10
```

---

## 🔍 Check Ingress Status

```bash
kubectl get ingress etelios-ingress -n etelios-prod
```

---

## 🔍 Check ALB Status

```bash
aws elbv2 describe-load-balancers \
  --region ap-south-1 \
  --query 'LoadBalancers[?contains(DNSName, `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189`)].{Name:LoadBalancerName,DNS:DNSName,State:State.Code}' \
  --output table
```

---

## 🚨 Common Issues

1. **DNS not resolving** - Check DNS configuration
2. **ALB not accessible** - Check security groups
3. **Services not running** - Check pod status
4. **Ingress misconfigured** - Check ingress annotations

---

**Run these tests to diagnose the issue!**
