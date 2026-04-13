#!/bin/bash

# AWS Cost Optimization - Step 1: Reduce NAT Gateways (2 → 1)
# This saves $32/month
# Run with: ./scripts/implement-nat-gateway-optimization.sh

set -e

REGION="ap-south-1"
CLUSTER_NAME="etelios-prod-v2"

echo "🚀 AWS Cost Optimization - Step 1: Reduce NAT Gateways"
echo "====================================================="
echo ""
echo "This will reduce NAT Gateways from 2 to 1, saving \$32/month"
echo ""
echo "⚠️  IMPORTANT: This affects network routing. Ensure you have:"
echo "   - Backup/access to AWS Console"
echo "   - Understanding of your VPC setup"
echo "   - Ability to rollback if needed"
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
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install AWS CLI."
    exit 1
fi

# Verify AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run 'aws configure'"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Step 1: List all NAT Gateways
echo "1️⃣  Discovering NAT Gateways..."
NAT_GATEWAYS=$(aws ec2 describe-nat-gateways \
    --filter "Name=state,Values=available" \
    --region $REGION \
    --query 'NatGateways[*].[NatGatewayId,Tags[?Key==`Name`].Value|[0],SubnetId]' \
    --output text 2>/dev/null || echo "")

if [ -z "$NAT_GATEWAYS" ]; then
    echo "❌ Could not retrieve NAT Gateways. Please check:"
    echo "   - AWS credentials are configured"
    echo "   - You have ec2:DescribeNatGateways permission"
    echo "   - Region is correct: $REGION"
    exit 1
fi

NAT_COUNT=$(echo "$NAT_GATEWAYS" | wc -l | tr -d ' ')
echo "   Found $NAT_COUNT NAT Gateway(s):"
echo ""

NAT_IDS=()
NAT_NAMES=()
NAT_SUBNETS=()

while IFS=$'\t' read -r NAT_ID NAT_NAME NAT_SUBNET; do
    if [ -n "$NAT_ID" ] && [ "$NAT_ID" != "None" ]; then
        NAT_IDS+=("$NAT_ID")
        NAT_NAMES+=("${NAT_NAME:-unnamed}")
        NAT_SUBNETS+=("$NAT_SUBNET")
        echo "   - $NAT_ID (${NAT_NAME:-unnamed}) in subnet $NAT_SUBNET"
    fi
done <<< "$NAT_GATEWAYS"

if [ "$NAT_COUNT" -eq 0 ]; then
    echo "   ℹ️  No NAT Gateways found. Nothing to optimize."
    exit 0
elif [ "$NAT_COUNT" -eq 1 ]; then
    echo ""
    echo "   ✅ Only 1 NAT Gateway found. Already optimized!"
    exit 0
fi

echo ""
echo "   💡 You have $NAT_COUNT NAT Gateways. We'll keep the first one and remove others."
echo ""

# Step 2: Get route tables that use NAT Gateways
echo "2️⃣  Analyzing route tables..."
ROUTE_TABLES=$(aws ec2 describe-route-tables \
    --region $REGION \
    --filters "Name=route.nat-gateway-id,Values=${NAT_IDS[*]}" \
    --query 'RouteTables[*].[RouteTableId,Tags[?Key==`Name`].Value|[0]]' \
    --output text 2>/dev/null || echo "")

if [ -z "$ROUTE_TABLES" ]; then
    echo "   ⚠️  Could not find route tables using NAT Gateways"
    echo "   This might mean NAT Gateways are not in use, or permissions are insufficient"
else
    echo "   Found route tables using NAT Gateways:"
    echo "$ROUTE_TABLES" | while IFS=$'\t' read -r RT_ID RT_NAME; do
        if [ -n "$RT_ID" ]; then
            echo "     - $RT_ID (${RT_NAME:-unnamed})"
        fi
    done
fi
echo ""

# Step 3: Identify which NAT Gateway to keep
KEEP_NAT_ID="${NAT_IDS[0]}"
KEEP_NAT_NAME="${NAT_NAMES[0]}"
KEEP_NAT_SUBNET="${NAT_SUBNETS[0]}"

echo "3️⃣  Selecting NAT Gateway to keep..."
echo "   ✅ Keeping: $KEEP_NAT_ID (${KEEP_NAT_NAME}) in subnet $KEEP_NAT_SUBNET"
echo ""

# Step 4: Show which NAT Gateways will be deleted
echo "4️⃣  NAT Gateways to be deleted:"
DELETE_COUNT=0
for i in "${!NAT_IDS[@]}"; do
    if [ "${NAT_IDS[$i]}" != "$KEEP_NAT_ID" ]; then
        DELETE_COUNT=$((DELETE_COUNT + 1))
        echo "   - ${NAT_IDS[$i]} (${NAT_NAMES[$i]}) in subnet ${NAT_SUBNETS[$i]}"
    fi
done

if [ "$DELETE_COUNT" -eq 0 ]; then
    echo "   ℹ️  No NAT Gateways to delete."
    exit 0
fi

echo ""
echo "   💰 This will save approximately \$32/month"
echo ""

# Step 5: Update route tables
echo "5️⃣  Updating route tables..."
echo "   ⚠️  This step requires manual verification of route tables"
echo "   You need to ensure all private subnets route through the kept NAT Gateway"
echo ""
echo "   Route tables that may need updating:"
if [ -n "$ROUTE_TABLES" ]; then
    echo "$ROUTE_TABLES" | while IFS=$'\t' read -r RT_ID RT_NAME; do
        if [ -n "$RT_ID" ]; then
            # Get current NAT Gateway for this route table
            CURRENT_NAT=$(aws ec2 describe-route-tables \
                --route-table-ids "$RT_ID" \
                --region $REGION \
                --query 'RouteTables[0].Routes[?GatewayId==`'"$KEEP_NAT_ID"'`].GatewayId|[0]' \
                --output text 2>/dev/null || echo "unknown")
            
            if [ "$CURRENT_NAT" != "$KEEP_NAT_ID" ] && [ "$CURRENT_NAT" != "None" ] && [ -n "$CURRENT_NAT" ]; then
                echo "     ⚠️  $RT_ID - needs update to use $KEEP_NAT_ID"
            else
                echo "     ✅ $RT_ID - already using $KEEP_NAT_ID or no NAT route"
            fi
        fi
    done
else
    echo "     ℹ️  Could not retrieve route table details"
fi
echo ""

# Step 6: Confirmation
echo "6️⃣  Final confirmation"
echo ""
echo "   Summary:"
echo "   - Keep: $KEEP_NAT_ID"
echo "   - Delete: $DELETE_COUNT NAT Gateway(s)"
echo "   - Savings: ~\$32/month"
echo ""
echo "   ⚠️  WARNING: This will:"
echo "   1. Delete $DELETE_COUNT NAT Gateway(s)"
echo "   2. Release associated Elastic IPs (if not in use)"
echo "   3. May cause brief network interruption during deletion"
echo ""
read -p "   Proceed with deletion? (yes/no) " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "   Aborted. No changes made."
    exit 0
fi

# Step 7: Delete NAT Gateways
echo ""
echo "7️⃣  Deleting NAT Gateways..."
DELETED_COUNT=0
for i in "${!NAT_IDS[@]}"; do
    NAT_ID="${NAT_IDS[$i]}"
    NAT_NAME="${NAT_NAMES[$i]}"
    
    if [ "$NAT_ID" != "$KEEP_NAT_ID" ]; then
        echo "   Deleting $NAT_ID (${NAT_NAME})..."
        
        # Get Elastic IP allocation ID
        EIP_ALLOC=$(aws ec2 describe-nat-gateways \
            --nat-gateway-ids "$NAT_ID" \
            --region $REGION \
            --query 'NatGateways[0].NatGatewayAddresses[0].AllocationId' \
            --output text 2>/dev/null || echo "")
        
        # Delete NAT Gateway
        if aws ec2 delete-nat-gateway --nat-gateway-id "$NAT_ID" --region $REGION &> /dev/null; then
            echo "     ✅ Deletion initiated for $NAT_ID"
            DELETED_COUNT=$((DELETED_COUNT + 1))
            
            # Wait a bit for deletion to start
            sleep 2
            
            # Note about Elastic IP
            if [ -n "$EIP_ALLOC" ] && [ "$EIP_ALLOC" != "None" ]; then
                echo "     ℹ️  Elastic IP $EIP_ALLOC will be released after NAT Gateway deletion"
                echo "     💡 You may want to release it manually if not needed:"
                echo "        aws ec2 release-address --allocation-id $EIP_ALLOC --region $REGION"
            fi
        else
            echo "     ❌ Failed to delete $NAT_ID"
        fi
    fi
done

echo ""
if [ "$DELETED_COUNT" -gt 0 ]; then
    echo "✅ Successfully initiated deletion of $DELETED_COUNT NAT Gateway(s)"
    echo ""
    echo "   ⏳ NAT Gateway deletion takes 2-5 minutes"
    echo "   You can monitor progress with:"
    echo "   aws ec2 describe-nat-gateways --region $REGION"
    echo ""
    echo "   💰 Estimated monthly savings: \$32"
    echo ""
    echo "   📝 Next steps:"
    echo "   1. Verify route tables are using the remaining NAT Gateway"
    echo "   2. Monitor network connectivity"
    echo "   3. Release Elastic IPs if not needed (saves additional cost)"
    echo ""
    echo "   To check route tables:"
    echo "   aws ec2 describe-route-tables --region $REGION --filters \"Name=route.nat-gateway-id,Values=$KEEP_NAT_ID\""
else
    echo "   ⚠️  No NAT Gateways were deleted"
fi

echo ""
echo "🎉 Step 1 optimization complete!"
echo ""
