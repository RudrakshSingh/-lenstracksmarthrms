# 🚀 Implementing Cost Optimization - Step 1

## Option A: Reduce NAT Gateways (2 → 1) - Save $32/month

### Prerequisites
- AWS CLI configured with appropriate permissions
- Access to AWS Console
- Understanding of your VPC setup

### Automated Method (Recommended)

Run the script:
```bash
./scripts/implement-nat-gateway-optimization.sh
```

The script will:
1. Discover all NAT Gateways
2. Identify which one to keep
3. Show route tables that need updating
4. Delete the extra NAT Gateway(s)
5. Provide next steps

### Manual Method (AWS Console)

#### Step 1: Identify NAT Gateways
1. Go to AWS Console → VPC → NAT Gateways
2. Note down all NAT Gateway IDs
3. Identify which one to keep (usually the first one created)

#### Step 2: Check Route Tables
1. Go to AWS Console → VPC → Route Tables
2. Filter by NAT Gateway ID
3. Note which route tables use which NAT Gateway

#### Step 3: Update Route Tables (if needed)
1. For each route table using a NAT Gateway you want to delete:
   - Click on the route table
   - Go to "Routes" tab
   - Find the route with destination `0.0.0.0/0` pointing to the NAT Gateway to be deleted
   - Edit the route and change it to point to the NAT Gateway you're keeping
   - Save changes

#### Step 4: Delete NAT Gateway
1. Go to AWS Console → VPC → NAT Gateways
2. Select the NAT Gateway you want to delete
3. Click "Actions" → "Delete NAT Gateway"
4. Confirm deletion
5. Wait 2-5 minutes for deletion to complete

#### Step 5: Release Elastic IP (Optional)
1. Go to AWS Console → EC2 → Elastic IPs
2. Find the Elastic IP that was attached to the deleted NAT Gateway
3. Select it → "Actions" → "Release Elastic IP addresses"
4. Confirm (this saves additional cost if the EIP is not needed)

### Verification
```bash
# Check remaining NAT Gateways
aws ec2 describe-nat-gateways \
  --filter "Name=state,Values=available" \
  --region ap-south-1

# Verify route tables
aws ec2 describe-route-tables \
  --region ap-south-1 \
  --filters "Name=route.nat-gateway-id,Values=<NAT_GATEWAY_ID>"
```

### Expected Savings
- **$32.40/month** (one NAT Gateway at $0.045/hour)
- **Additional:** Elastic IP charges if released (if not attached to anything)

---

## Option B: Remove Grafana LoadBalancer - Save $9/month

### Prerequisites
- kubectl configured and connected to your cluster
- Access to monitoring namespace

### Step 1: Check Current Setup
```bash
# Check if Grafana service exists
kubectl get svc -n monitoring prometheus-grafana

# Check service type
kubectl get svc -n monitoring prometheus-grafana -o jsonpath='{.spec.type}'
```

### Step 2: Convert to ClusterIP
```bash
# Patch the service to ClusterIP
kubectl patch svc prometheus-grafana -n monitoring -p '{"spec":{"type":"ClusterIP"}}'

# Verify
kubectl get svc -n monitoring prometheus-grafana
```

### Step 3: Access Grafana

**Option A: Port Forward (Development)**
```bash
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# Access at http://localhost:3000
```

**Option B: Add to Ingress (Production)**
```yaml
# Add to your existing ingress.yaml
- host: grafana.yourdomain.com  # or use existing ALB
  http:
    paths:
    - path: /grafana
      pathType: Prefix
      backend:
        service:
          name: prometheus-grafana
          port:
            number: 80
```

Then apply:
```bash
kubectl apply -f k8s/ingress.yaml
```

### Verification
```bash
# Check service type (should be ClusterIP)
kubectl get svc -n monitoring prometheus-grafana

# Check LoadBalancer is deleted in AWS Console
# AWS Console → EC2 → Load Balancers
```

### Expected Savings
- **$9/month** (LoadBalancer charges)

---

## Option C: Optimize CloudWatch Log Retention - Save $2-4/month

### Step 1: List Log Groups
```bash
aws logs describe-log-groups \
  --region ap-south-1 \
  --query 'logGroups[*].logGroupName' \
  --output table
```

### Step 2: Set Retention Policy
```bash
# For EKS cluster logs (3 days)
aws logs put-retention-policy \
  --log-group-name /aws/eks/etelios-prod-v2/cluster \
  --retention-in-days 3 \
  --region ap-south-1

# For Container Insights (3 days)
aws logs put-retention-policy \
  --log-group-name /aws/containerinsights/etelios-prod-v2/application \
  --retention-in-days 3 \
  --region ap-south-1

# For all log groups with "etelios" in name
aws logs describe-log-groups \
  --region ap-south-1 \
  --log-group-name-prefix "/aws" \
  --query 'logGroups[*].logGroupName' \
  --output text | \
  while read loggroup; do
    if [[ $loggroup == *"etelios"* ]] || [[ $loggroup == *"eks"* ]]; then
      echo "Setting retention for $loggroup"
      aws logs put-retention-policy \
        --log-group-name "$loggroup" \
        --retention-in-days 3 \
        --region ap-south-1
    fi
  done
```

### Step 3: Verify
```bash
aws logs describe-log-groups \
  --region ap-south-1 \
  --query 'logGroups[*].[logGroupName,retentionInDays]' \
  --output table
```

### Expected Savings
- **$2-4/month** (depending on log volume)

---

## Recommended Order

1. **Start with Grafana LoadBalancer removal** (safest, quickest)
2. **Then optimize CloudWatch retention** (also very safe)
3. **Finally reduce NAT Gateways** (requires more care)

---

## Quick Implementation Script

For all three optimizations at once:
```bash
./scripts/aws-cost-optimization-quick-wins.sh
```

---

## Troubleshooting

### NAT Gateway Deletion Fails
- Check if route tables are still using it
- Ensure no resources depend on it
- Check AWS Console for error messages

### Grafana Not Accessible After Change
- Verify port-forward is running
- Check service is ClusterIP type
- Verify pod is running: `kubectl get pods -n monitoring`

### CloudWatch Logs Missing
- Check retention policy was set correctly
- Verify log groups exist
- Check IAM permissions for logs:PutRetentionPolicy

---

## Next Steps

After completing Step 1:
1. Monitor costs in AWS Cost Explorer
2. Verify all services are working correctly
3. Proceed to Step 2: Spot Instances (see main guide)

---

**Total Savings from Step 1: $43-45/month**
