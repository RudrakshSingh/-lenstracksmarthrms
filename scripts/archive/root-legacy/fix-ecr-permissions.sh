#!/bin/bash

set -e

REGION="ap-south-1"

echo "=========================================="
echo "Fix ECR Permissions for Node Role"
echo "=========================================="
echo ""

# Find all node roles
echo "🔍 Finding node IAM roles..."

# Method 1: eksctl created roles
EKSCTL_ROLES=$(aws iam list-roles --query "Roles[?contains(RoleName, 'eksctl-etelios-prod-nodegroup')].RoleName" --output text --region $REGION 2>/dev/null || echo "")

# Method 2: Our created role
MANUAL_ROLE="EteliosEKSNodeGroupRole"

# Method 3: Check actual EC2 instances for their role
INSTANCE_ROLE=$(aws ec2 describe-instances \
    --filters "Name=tag:eks:cluster-name,Values=etelios-prod" "Name=instance-state-name,Values=running" \
    --query "Reservations[0].Instances[0].IamInstanceProfile.Arn" \
    --output text --region $REGION 2>/dev/null | cut -d'/' -f2 || echo "")

echo "Found roles:"
if [ -n "$EKSCTL_ROLES" ]; then
    echo "  - $EKSCTL_ROLES (eksctl created)"
fi
if aws iam get-role --role-name $MANUAL_ROLE &>/dev/null; then
    echo "  - $MANUAL_ROLE (manually created)"
fi
if [ -n "$INSTANCE_ROLE" ]; then
    echo "  - $INSTANCE_ROLE (from EC2 instances)"
fi
echo ""

# Attach ECR policy to all found roles
echo "🔧 Attaching ECR ReadOnly policy to all roles..."

for role in $EKSCTL_ROLES $MANUAL_ROLE $INSTANCE_ROLE; do
    if [ -n "$role" ] && [ "$role" != "None" ]; then
        echo -n "  Attaching to $role... "
        if aws iam attach-role-policy \
            --role-name "$role" \
            --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly \
            --region $REGION 2>/dev/null; then
            echo "✅"
        else
            echo "⚠️  (may already be attached)"
        fi
    fi
done

echo ""
echo "✅ ECR permissions configured"
echo ""
echo "💡 Pods should now be able to pull images from ECR"
echo "   Restart pods: kubectl delete pods --all -n etelios-prod"
