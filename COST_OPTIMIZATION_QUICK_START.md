# 🚀 Quick Start - Run Cost Optimization Now

## ⚡ Fastest Way to Save $43-45/month

### Option 1: Auto-Run (Recommended)

```bash
# Make sure AWS CLI and kubectl are configured
AUTO_YES=1 ./scripts/run-cost-optimization-auto.sh
```

This will automatically:
1. ✅ Reduce NAT Gateways (2 → 1) - Save $32/month
2. ✅ Remove Grafana LoadBalancer - Save $9/month  
3. ✅ Optimize CloudWatch retention - Save $2-4/month

**Total Savings: $43-45/month**

---

### Option 2: Interactive (Safer)

```bash
# Step 1: NAT Gateways
./scripts/implement-nat-gateway-optimization.sh

# Step 2: Quick wins (includes Grafana + CloudWatch)
./scripts/aws-cost-optimization-quick-wins.sh
```

---

### Option 3: Manual (AWS Console)

#### 1. Reduce NAT Gateways ($32/month)
1. Go to: AWS Console → VPC → NAT Gateways
2. Identify 2 NAT Gateways
3. Delete one (keep the first one)
4. Update route tables if needed

#### 2. Remove Grafana LoadBalancer ($9/month)
```bash
kubectl patch svc prometheus-grafana -n monitoring -p '{"spec":{"type":"ClusterIP"}}'
```

#### 3. Optimize CloudWatch ($2-4/month)
```bash
# Set retention to 3 days for all etelios/eks logs
aws logs describe-log-groups --region ap-south-1 --query 'logGroups[*].logGroupName' --output text | \
  while read loggroup; do
    if [[ $loggroup == *"etelios"* ]] || [[ $loggroup == *"eks"* ]]; then
      aws logs put-retention-policy --log-group-name "$loggroup" --retention-in-days 3 --region ap-south-1
    fi
  done
```

---

## ✅ Prerequisites

1. **AWS CLI configured:**
   ```bash
   aws configure
   aws sts get-caller-identity  # Verify
   ```

2. **kubectl configured:**
   ```bash
   kubectl cluster-info  # Verify
   ```

3. **Required AWS Permissions:**
   - `ec2:DescribeNatGateways`
   - `ec2:DeleteNatGateway`
   - `ec2:DescribeRouteTables`
   - `logs:DescribeLogGroups`
   - `logs:PutRetentionPolicy`

---

## 🎯 What Gets Changed

### NAT Gateways
- **Before:** 2 NAT Gateways ($64.80/month)
- **After:** 1 NAT Gateway ($32.40/month)
- **Savings:** $32.40/month

### Grafana Service
- **Before:** LoadBalancer type ($9/month)
- **After:** ClusterIP (access via port-forward or Ingress)
- **Savings:** $9/month

### CloudWatch Logs
- **Before:** Default retention (indefinite)
- **After:** 3-day retention
- **Savings:** $2-4/month (depends on log volume)

---

## ⚠️ Important Notes

1. **NAT Gateway deletion takes 2-5 minutes**
2. **Grafana access:** Use `kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80`
3. **Monitor costs:** Check AWS Cost Explorer after 24 hours

---

## 📊 Verify Changes

```bash
# Check NAT Gateways
aws ec2 describe-nat-gateways --filter "Name=state,Values=available" --region ap-south-1

# Check Grafana service
kubectl get svc -n monitoring prometheus-grafana

# Check CloudWatch retention
aws logs describe-log-groups --region ap-south-1 --query 'logGroups[*].[logGroupName,retentionInDays]' --output table
```

---

## 🆘 Troubleshooting

### NAT Gateway deletion fails
- Check route tables aren't using it
- Wait for any dependent resources to be removed

### Grafana not accessible
- Use port-forward: `kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80`
- Or add to Ingress (see main guide)

### CloudWatch errors
- Check IAM permissions
- Verify log group names

---

**Ready? Run:** `AUTO_YES=1 ./scripts/run-cost-optimization-auto.sh`
