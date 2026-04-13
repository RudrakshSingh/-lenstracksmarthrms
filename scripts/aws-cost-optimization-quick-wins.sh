#!/bin/bash

# AWS Cost Optimization - Quick Wins Script
# This script implements the easiest cost optimizations that can save $50-70/month
# Run with: ./scripts/aws-cost-optimization-quick-wins.sh

set -e

REGION="ap-south-1"
CLUSTER_NAME="etelios-prod-v2"
NAMESPACE="etelios-prod"

echo "🚀 AWS Cost Optimization - Quick Wins"
echo "======================================"
echo ""
echo "This script will implement quick cost optimizations:"
echo "1. Remove Grafana LoadBalancer (Save \$9/month)"
echo "2. Optimize CloudWatch log retention (Save \$2-4/month)"
echo "3. Check NAT Gateway usage (Save \$32/month if reduced)"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Check prerequisites
echo ""
echo "📋 Checking prerequisites..."
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install kubectl."
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install AWS CLI."
    exit 1
fi

# Check cluster access
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Cannot access Kubernetes cluster. Please configure kubeconfig."
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# 1. Remove Grafana LoadBalancer
echo "1️⃣  Removing Grafana LoadBalancer (Save \$9/month)..."
if kubectl get svc prometheus-grafana -n monitoring &> /dev/null; then
    SERVICE_TYPE=$(kubectl get svc prometheus-grafana -n monitoring -o jsonpath='{.spec.type}')
    if [ "$SERVICE_TYPE" == "LoadBalancer" ]; then
        echo "   Current: LoadBalancer type detected"
        read -p "   Convert to ClusterIP and use Ingress/port-forward? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Patch service to ClusterIP
            kubectl patch svc prometheus-grafana -n monitoring -p '{"spec":{"type":"ClusterIP"}}'
            echo "   ✅ Grafana service converted to ClusterIP"
            echo "   📝 Access Grafana via: kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80"
            echo "   💰 Savings: \$9/month"
        else
            echo "   ⏭️  Skipped"
        fi
    else
        echo "   ✅ Already using ClusterIP (no LoadBalancer cost)"
    fi
else
    echo "   ⚠️  Grafana service not found. Skipping."
fi
echo ""

# 2. Optimize CloudWatch Log Retention
echo "2️⃣  Optimizing CloudWatch log retention (Save \$2-4/month)..."
echo "   Setting log retention to 3 days for most logs..."

# Get log groups
LOG_GROUPS=$(aws logs describe-log-groups --region $REGION --query 'logGroups[*].logGroupName' --output text 2>/dev/null || echo "")

if [ -n "$LOG_GROUPS" ]; then
    for LOG_GROUP in $LOG_GROUPS; do
        if [[ $LOG_GROUP == *"etelios"* ]] || [[ $LOG_GROUP == *"eks"* ]] || [[ $LOG_GROUP == *"containerinsights"* ]]; then
            echo "   Setting retention for: $LOG_GROUP"
            aws logs put-retention-policy \
                --log-group-name "$LOG_GROUP" \
                --retention-in-days 3 \
                --region $REGION 2>/dev/null || echo "     ⚠️  Could not update (may need permissions)"
        fi
    done
    echo "   ✅ Log retention optimized"
    echo "   💰 Savings: \$2-4/month"
else
    echo "   ⚠️  No log groups found or insufficient permissions"
fi
echo ""

# 3. Check NAT Gateway Usage
echo "3️⃣  Checking NAT Gateway usage (Potential save \$32/month)..."
NAT_GATEWAYS=$(aws ec2 describe-nat-gateways \
    --filter "Name=state,Values=available" \
    --region $REGION \
    --query 'NatGateways[*].[NatGatewayId,Tags[?Key==`Name`].Value|[0]]' \
    --output text 2>/dev/null || echo "")

if [ -n "$NAT_GATEWAYS" ]; then
    NAT_COUNT=$(echo "$NAT_GATEWAYS" | wc -l | tr -d ' ')
    echo "   Found $NAT_COUNT NAT Gateway(s):"
    echo "$NAT_GATEWAYS" | while read -r NAT_ID NAT_NAME; do
        echo "     - $NAT_NAME ($NAT_ID)"
    done
    
    if [ "$NAT_COUNT" -gt 1 ]; then
        echo ""
        echo "   💡 You have $NAT_COUNT NAT Gateways. Reducing to 1 can save \$32/month"
        echo "   ⚠️  This requires updating route tables. Manual step required."
        echo ""
        echo "   To reduce NAT Gateways:"
        echo "   1. Identify which NAT Gateway to keep (usually the first one)"
        echo "   2. Update private subnet route tables to use single NAT Gateway"
        echo "   3. Delete the unused NAT Gateway"
        echo ""
        echo "   See docs/AWS_COST_OPTIMIZATION_GUIDE.md for detailed steps"
    else
        echo "   ✅ Only 1 NAT Gateway found (already optimized)"
    fi
else
    echo "   ⚠️  Could not retrieve NAT Gateway information"
fi
echo ""

# 4. Check EBS Storage Type
echo "4️⃣  Checking EBS storage types (Potential save \$1-2/month)..."
PVC_COUNT=$(kubectl get pvc --all-namespaces -o json 2>/dev/null | jq -r '.items | length' || echo "0")

if [ "$PVC_COUNT" -gt 0 ]; then
    echo "   Found $PVC_COUNT PersistentVolumeClaim(s)"
    echo "   Checking storage classes..."
    
    STORAGE_CLASSES=$(kubectl get storageclass -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")
    
    if echo "$STORAGE_CLASSES" | grep -q "gp2"; then
        echo "   ⚠️  Found gp2 storage class. Consider migrating to gp3 (20% cheaper)"
        echo "   💡 gp3 is 20% cheaper with same/better performance"
        echo "   See docs/AWS_COST_OPTIMIZATION_GUIDE.md for migration steps"
    else
        echo "   ✅ No gp2 storage classes found (or already using gp3)"
    fi
else
    echo "   ℹ️  No persistent volumes found"
fi
echo ""

# 5. Check ALB Compression
echo "5️⃣  Checking ALB compression settings (Potential save \$5-10/month)..."
INGRESSES=$(kubectl get ingress -n $NAMESPACE -o json 2>/dev/null | jq -r '.items[*].metadata.name' || echo "")

if [ -n "$INGRESSES" ]; then
    echo "   Found Ingress resources. Checking compression settings..."
    for INGRESS in $INGRESSES; do
        COMPRESSION=$(kubectl get ingress $INGRESS -n $NAMESPACE -o jsonpath='{.metadata.annotations.alb\.ingress\.kubernetes\.io/load-balancer-attributes}' 2>/dev/null || echo "")
        if [[ $COMPRESSION != *"compression.enabled=true"* ]]; then
            echo "   ⚠️  Compression not enabled for $INGRESS"
            echo "   💡 Enable compression to reduce data transfer costs"
            echo "   See docs/AWS_COST_OPTIMIZATION_GUIDE.md for configuration"
        else
            echo "   ✅ Compression enabled for $INGRESS"
        fi
    done
else
    echo "   ℹ️  No Ingress resources found in $NAMESPACE namespace"
fi
echo ""

# Summary
echo "📊 Summary"
echo "=========="
echo ""
echo "✅ Quick optimizations completed:"
echo "   - Grafana LoadBalancer: Checked/Removed"
echo "   - CloudWatch retention: Optimized to 3 days"
echo "   - NAT Gateways: Reviewed (manual action may be needed)"
echo "   - EBS Storage: Reviewed (migration to gp3 recommended)"
echo "   - ALB Compression: Reviewed (enable if not already)"
echo ""
echo "💰 Estimated Monthly Savings:"
echo "   - Grafana LB removal: \$9/month"
echo "   - CloudWatch optimization: \$2-4/month"
echo "   - NAT Gateway reduction (if done): \$32/month"
echo "   - EBS gp3 migration (if done): \$1-2/month"
echo "   - ALB compression (if enabled): \$5-10/month"
echo ""
echo "📝 Next Steps:"
echo "   1. Review the changes made"
echo "   2. Test Grafana access via port-forward or Ingress"
echo "   3. Consider reducing NAT Gateways (see guide)"
echo "   4. Review full optimization guide: docs/AWS_COST_OPTIMIZATION_GUIDE.md"
echo ""
echo "🎯 For more optimizations, see: docs/AWS_COST_OPTIMIZATION_GUIDE.md"
echo ""
