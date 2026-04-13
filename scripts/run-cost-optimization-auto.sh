#!/bin/bash

# Auto-run cost optimization (non-interactive)
# Use with caution - this makes actual AWS changes
# Run with: AUTO_YES=1 ./scripts/run-cost-optimization-auto.sh

set -e

REGION="ap-south-1"

echo "🚀 AWS Cost Optimization - Auto Run"
echo "===================================="
echo ""

# Check if AUTO_YES is set
if [ "$AUTO_YES" != "1" ]; then
    echo "⚠️  This script will make AWS changes!"
    echo "Set AUTO_YES=1 to run automatically"
    echo ""
    echo "Usage: AUTO_YES=1 ./scripts/run-cost-optimization-auto.sh"
    exit 1
fi

# Step 1: Reduce NAT Gateways
echo "1️⃣  Reducing NAT Gateways (2 → 1)..."
NAT_GATEWAYS=$(aws ec2 describe-nat-gateways \
    --filter "Name=state,Values=available" \
    --region $REGION \
    --query 'NatGateways[*].[NatGatewayId,Tags[?Key==`Name`].Value|[0]]' \
    --output text 2>/dev/null || echo "")

if [ -z "$NAT_GATEWAYS" ]; then
    echo "   ⚠️  Could not retrieve NAT Gateways. Skipping."
else
    NAT_COUNT=$(echo "$NAT_GATEWAYS" | wc -l | tr -d ' ')
    if [ "$NAT_COUNT" -gt 1 ]; then
        KEEP_NAT=$(echo "$NAT_GATEWAYS" | head -1 | awk '{print $1}')
        echo "   Keeping: $KEEP_NAT"
        
        # Delete others
        echo "$NAT_GATEWAYS" | tail -n +2 | while read -r NAT_ID NAT_NAME; do
            if [ -n "$NAT_ID" ] && [ "$NAT_ID" != "None" ] && [ "$NAT_ID" != "$KEEP_NAT" ]; then
                echo "   Deleting: $NAT_ID"
                aws ec2 delete-nat-gateway --nat-gateway-id "$NAT_ID" --region $REGION 2>/dev/null || echo "     ⚠️  Failed to delete $NAT_ID"
            fi
        done
        echo "   ✅ NAT Gateway optimization initiated"
    else
        echo "   ✅ Already optimized (only $NAT_COUNT NAT Gateway)"
    fi
fi
echo ""

# Step 2: Remove Grafana LoadBalancer
echo "2️⃣  Removing Grafana LoadBalancer..."
if kubectl get svc prometheus-grafana -n monitoring &> /dev/null; then
    SERVICE_TYPE=$(kubectl get svc prometheus-grafana -n monitoring -o jsonpath='{.spec.type}' 2>/dev/null || echo "")
    if [ "$SERVICE_TYPE" == "LoadBalancer" ]; then
        kubectl patch svc prometheus-grafana -n monitoring -p '{"spec":{"type":"ClusterIP"}}' 2>/dev/null && \
        echo "   ✅ Grafana service converted to ClusterIP" || \
        echo "   ⚠️  Failed to convert Grafana service"
    else
        echo "   ✅ Grafana already using $SERVICE_TYPE (no LoadBalancer)"
    fi
else
    echo "   ℹ️  Grafana service not found in monitoring namespace"
fi
echo ""

# Step 3: Optimize CloudWatch Log Retention
echo "3️⃣  Optimizing CloudWatch log retention..."
LOG_GROUPS=$(aws logs describe-log-groups \
    --region $REGION \
    --query 'logGroups[*].logGroupName' \
    --output text 2>/dev/null || echo "")

if [ -n "$LOG_GROUPS" ]; then
    UPDATED=0
    for LOG_GROUP in $LOG_GROUPS; do
        if [[ $LOG_GROUP == *"etelios"* ]] || [[ $LOG_GROUP == *"eks"* ]] || [[ $LOG_GROUP == *"containerinsights"* ]]; then
            aws logs put-retention-policy \
                --log-group-name "$LOG_GROUP" \
                --retention-in-days 3 \
                --region $REGION 2>/dev/null && UPDATED=$((UPDATED + 1)) || true
        fi
    done
    echo "   ✅ Updated retention for $UPDATED log groups"
else
    echo "   ⚠️  Could not retrieve log groups"
fi
echo ""

echo "✅ Cost optimization steps completed!"
echo ""
echo "💰 Estimated monthly savings:"
echo "   - NAT Gateway reduction: \$32/month"
echo "   - Grafana LoadBalancer removal: \$9/month"
echo "   - CloudWatch optimization: \$2-4/month"
echo "   Total: ~\$43-45/month"
echo ""
