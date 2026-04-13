# 🔍 ALB Check Commands - Quick Reference

## Check Which ALB is Currently Active

### Command 1: Check Ingress ALB

```bash
kubectl get ingress etelios-ingress -n etelios-prod
```

**Look at ADDRESS column** - this shows the active ALB.

### Command 2: Get ALB Hostname

```bash
kubectl get ingress etelios-ingress -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' && echo
```

### Command 3: Check DNS

```bash
nslookup api.etelios.com 8.8.8.8
```

**Shows which ALB hostname DNS points to.**

### Command 4: List All ALBs in AWS

```bash
aws elbv2 describe-load-balancers \
  --region ap-south-1 \
  --query 'LoadBalancers[*].[LoadBalancerName,DNSName,State.Code]' \
  --output table
```

**Shows all ALBs in your AWS account.**

---

## Expected Output

### Active ALB (Current):
```
k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
```

### If You Have 2 ALBs:
Compare the hostname from ingress with the list from AWS to see which one is active.

---

**Run these commands to identify which ALB is currently being used!**
