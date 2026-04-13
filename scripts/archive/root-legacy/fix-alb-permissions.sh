#!/bin/bash

set -e

ACCOUNT_ID="383234048604"
POLICY_NAME="AWSLoadBalancerControllerIAMPolicy"

echo "Adding missing permissions to ALB controller policy..."

# Get current policy version
POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}"

# Create updated policy with missing permission
cat > alb-policy-update.json <<POLICY
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "elasticloadbalancing:*"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "ec2:*",
                "iam:CreateServiceLinkedRole",
                "waf-regional:*",
                "wafv2:*",
                "shield:*",
                "acm:*",
                "cognito-idp:*",
                "tag:*"
            ],
            "Resource": "*"
        }
    ]
}
POLICY

# Update the policy
aws iam create-policy-version \
    --policy-arn ${POLICY_ARN} \
    --policy-document file://alb-policy-update.json \
    --set-as-default

echo "✅ Policy updated!"
echo "Restarting ALB controller..."

kubectl rollout restart deployment aws-load-balancer-controller -n kube-system

echo "Waiting for restart..."
sleep 30

echo "✅ ALB controller restarted with new permissions!"
