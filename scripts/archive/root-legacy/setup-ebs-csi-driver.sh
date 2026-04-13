#!/bin/bash

set -e

CLUSTER_NAME="etelios-prod-v2"
REGION="ap-south-1"
ACCOUNT_ID="383234048604"

echo "=========================================="
echo "Installing EBS CSI Driver"
echo "=========================================="

# Create IAM OIDC provider for cluster
echo "Creating IAM OIDC provider..."
eksctl utils associate-iam-oidc-provider \
  --cluster=${CLUSTER_NAME} \
  --region=${REGION} \
  --approve

# Create IAM service account for EBS CSI driver
echo "Creating IAM service account for EBS CSI driver..."
eksctl create iamserviceaccount \
  --cluster=${CLUSTER_NAME} \
  --region=${REGION} \
  --name=ebs-csi-controller-sa \
  --namespace=kube-system \
  --attach-policy-arn=arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy \
  --approve \
  --role-only \
  --role-name=AmazonEKS_EBS_CSI_DriverRole

# Install EBS CSI driver addon
echo "Installing EBS CSI driver addon..."
eksctl create addon \
  --cluster=${CLUSTER_NAME} \
  --region=${REGION} \
  --name=aws-ebs-csi-driver \
  --service-account-role-arn=arn:aws:iam::${ACCOUNT_ID}:role/AmazonEKS_EBS_CSI_DriverRole \
  --force

echo "Waiting for EBS CSI driver to be ready..."
sleep 30

echo "✅ EBS CSI Driver installed!"
echo ""
echo "Verify with:"
echo "  kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-ebs-csi-driver"
