#!/bin/bash

set -e

NAMESPACE="etelios-prod"

echo "=========================================="
echo "Setting up Ingress (Replacing LoadBalancers)"
echo "=========================================="

# First, convert existing LoadBalancer services to ClusterIP
echo "Converting auth and hr services to ClusterIP..."
kubectl patch svc auth-service -n ${NAMESPACE} -p '{"spec":{"type":"ClusterIP"}}'
kubectl patch svc hr-service -n ${NAMESPACE} -p '{"spec":{"type":"ClusterIP"}}'

# Wait for LoadBalancers to be deleted
echo "Waiting for old LoadBalancers to be deleted (30 seconds)..."
sleep 30

# Create Ingress
echo "Creating Ingress with ALB..."
kubectl apply -f - <<YAML
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: etelios-ingress
  namespace: ${NAMESPACE}
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}]'
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/healthcheck-interval-seconds: '30'
    alb.ingress.kubernetes.io/healthcheck-timeout-seconds: '5'
    alb.ingress.kubernetes.io/healthy-threshold-count: '2'
    alb.ingress.kubernetes.io/unhealthy-threshold-count: '2'
spec:
  ingressClassName: alb
  rules:
  - http:
      paths:
      - path: /api/auth
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 80
      - path: /api/hr
        pathType: Prefix
        backend:
          service:
            name: hr-service
            port:
              number: 80
      - path: /api/analytics
        pathType: Prefix
        backend:
          service:
            name: analytics-service
            port:
              number: 80
      - path: /api/attendance
        pathType: Prefix
        backend:
          service:
            name: attendance-service
            port:
              number: 80
      - path: /api/payroll
        pathType: Prefix
        backend:
          service:
            name: payroll-service
            port:
              number: 80
      - path: /api/crm
        pathType: Prefix
        backend:
          service:
            name: crm-service
            port:
              number: 80
      - path: /api/document
        pathType: Prefix
        backend:
          service:
            name: document-service
            port:
              number: 80
      - path: /api/financial
        pathType: Prefix
        backend:
          service:
            name: financial-service
            port:
              number: 80
      - path: /api/inventory
        pathType: Prefix
        backend:
          service:
            name: inventory-service
            port:
              number: 80
      - path: /api/jts
        pathType: Prefix
        backend:
          service:
            name: jts-service
            port:
              number: 80
      - path: /api/monitoring
        pathType: Prefix
        backend:
          service:
            name: monitoring-service
            port:
              number: 80
      - path: /api/notification
        pathType: Prefix
        backend:
          service:
            name: notification-service
            port:
              number: 80
      - path: /api/prescription
        pathType: Prefix
        backend:
          service:
            name: prescription-service
            port:
              number: 80
      - path: /api/purchase
        pathType: Prefix
        backend:
          service:
            name: purchase-service
            port:
              number: 80
      - path: /api/realtime
        pathType: Prefix
        backend:
          service:
            name: realtime-service
            port:
              number: 80
      - path: /api/sales
        pathType: Prefix
        backend:
          service:
            name: sales-service
            port:
              number: 80
      - path: /api/tenant
        pathType: Prefix
        backend:
          service:
            name: tenant-management-service
            port:
              number: 80
      - path: /
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 80
YAML

echo ""
echo "Waiting for Ingress to provision ALB (2-3 minutes)..."
sleep 60

echo ""
echo "✅ Ingress created!"
echo ""
echo "Get ALB URL:"
echo "  kubectl get ingress etelios-ingress -n ${NAMESPACE}"
echo ""
echo "💰 Cost Savings:"
echo "  Before: 20 LoadBalancers x \$9/month = \$180/month"
echo "  After:  1 ALB = \$18/month"
echo "  Saved: \$162/month"
