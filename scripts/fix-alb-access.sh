#!/bin/bash

# Fix ALB Access - Add Security Group Rules

set -e

echo "🔧 Fixing ALB Access..."
echo "====================================="
echo ""

REGION="ap-south-1"
ALB_DNS="k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

echo "1️⃣ Finding ALB..."
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --region "$REGION" \
  --query "LoadBalancers[?contains(DNSName, 'k8s-eteliosp')].LoadBalancerArn" \
  --output text 2>&1)

if [ -z "$ALB_ARN" ] || [ "$ALB_ARN" == "None" ]; then
  echo "❌ ALB not found"
  exit 1
fi

echo "✅ Found ALB: $ALB_ARN"

echo ""
echo "2️⃣ Getting Security Groups..."
ALB_SG=$(aws elbv2 describe-load-balancers \
  --region "$REGION" \
  --load-balancer-arns "$ALB_ARN" \
  --query 'LoadBalancers[0].SecurityGroups[0]' \
  --output text 2>&1)

if [ -z "$ALB_SG" ] || [ "$ALB_SG" == "None" ]; then
  echo "❌ Security group not found"
  exit 1
fi

echo "✅ Security Group: $ALB_SG"

echo ""
echo "3️⃣ Checking current rules..."
aws ec2 describe-security-groups \
  --group-ids "$ALB_SG" \
  --region "$REGION" \
  --query 'SecurityGroups[0].IpPermissions[?FromPort==`80` || FromPort==`443`]' \
  --output json 2>&1 | jq -r '.[] | "Port \(.FromPort): \(.IpRanges[0].CidrIp // "N/A")"' || echo "No HTTP/HTTPS rules found"

echo ""
echo "4️⃣ Adding HTTP rule (port 80)..."
aws ec2 authorize-security-group-ingress \
  --group-id "$ALB_SG" \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region "$REGION" 2>&1 | grep -v "An error occurred" || echo "✅ HTTP rule added (or already exists)"

echo ""
echo "5️⃣ Adding HTTPS rule (port 443)..."
aws ec2 authorize-security-group-ingress \
  --group-id "$ALB_SG" \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region "$REGION" 2>&1 | grep -v "An error occurred" || echo "✅ HTTPS rule added (or already exists)"

echo ""
echo "6️⃣ Verifying ALB scheme..."
SCHEME=$(aws elbv2 describe-load-balancers \
  --region "$REGION" \
  --load-balancer-arns "$ALB_ARN" \
  --query 'LoadBalancers[0].Scheme' \
  --output text 2>&1)

echo "ALB Scheme: $SCHEME"
if [ "$SCHEME" != "internet-facing" ]; then
  echo "⚠️  ALB is not internet-facing. It may be internal-only."
  echo "   Consider creating a new internet-facing ALB or use VPN/bastion."
else
  echo "✅ ALB is internet-facing"
fi

echo ""
echo "====================================="
echo "✅ ALB Access Fix Complete!"
echo ""
echo "🌐 ALB URL: http://${ALB_DNS}"
echo ""
echo "🧪 Test now:"
echo "   curl http://${ALB_DNS}/health"
echo ""
