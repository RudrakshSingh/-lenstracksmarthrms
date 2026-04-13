#!/bin/bash

set -e

CLUSTER_NAME="etelios-prod-v2"
REGION="ap-south-1"
ACCOUNT_ID="383234048604"

echo "=========================================="
echo "Installing AWS Load Balancer Controller"
echo "=========================================="

# Create IAM policy for ALB controller
echo "Creating IAM policy..."
curl -o iam-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.7.0/docs/install/iam_policy.json

aws iam create-policy \
    --policy-name AWSLoadBalancerControllerIAMPolicy \
    --policy-document file://iam-policy.json 2>/dev/null || echo "Policy already exists"

# Create IAM service account
echo "Creating IAM service account for ALB controller..."
eksctl create iamserviceaccount \
  --cluster=${CLUSTER_NAME} \
  --region=${REGION} \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::${ACCOUNT_ID}:policy/AWSLoadBalancerControllerIAMPolicy \
  --override-existing-serviceaccounts \
  --approve

# Install cert-manager (required for ALB controller)
echo "Installing cert-manager..."
kubectl apply --validate=false -f https://github.com/jetstack/cert-manager/releases/download/v1.13.0/cert-manager.yaml

echo "Waiting for cert-manager..."
sleep 30

# Install ALB controller using Helm
echo "Installing AWS Load Balancer Controller..."
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=${CLUSTER_NAME} \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set region=${REGION} \
  --set vpcId=$(aws eks describe-cluster --name ${CLUSTER_NAME} --region ${REGION} --query "cluster.resourcesVpcConfig.vpcId" --output text)

echo "Waiting for ALB controller..."
sleep 20

echo "✅ AWS Load Balancer Controller installed!"
echo ""
echo "Verify with:"
echo "  kubectl get deployment -n kube-system aws-load-balancer-controller"
