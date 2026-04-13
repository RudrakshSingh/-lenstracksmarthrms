#!/bin/bash

set -e

NAMESPACE="etelios-prod"

echo "=========================================="
echo "Fixing Ingress Routes"
echo "=========================================="
echo ""

echo "Updating Ingress to include JTS and Tenant services..."

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
      # Auth Service
      - path: /api/auth
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 80
      # HR Service
      - path: /api/hr
        pathType: Prefix
        backend:
          service:
            name: hr-service
            port:
              number: 80
      # Attendance Service
      - path: /api/attendance
        pathType: Prefix
        backend:
          service:
            name: attendance-service
            port:
              number: 80
      # JTS Service
      - path: /api/jts
        pathType: Prefix
        backend:
          service:
            name: jts-service
            port:
              number: 80
      # Tenant Management Service
      - path: /api/tenant-management
        pathType: Prefix
        backend:
          service:
            name: tenant-management-service
            port:
              number: 80
      # Tenant Registry Service  
      - path: /api/tenant-registry
        pathType: Prefix
        backend:
          service:
            name: tenant-registry-service
            port:
              number: 80
      # Tenant (alias for tenant-management)
      - path: /api/tenant
        pathType: Prefix
        backend:
          service:
            name: tenant-management-service
            port:
              number: 80
      # Analytics Service
      - path: /api/analytics
        pathType: Prefix
        backend:
          service:
            name: analytics-service
            port:
              number: 80
      # Payroll Service
      - path: /api/payroll
        pathType: Prefix
        backend:
          service:
            name: payroll-service
            port:
              number: 80
      # CRM Service
      - path: /api/crm
        pathType: Prefix
        backend:
          service:
            name: crm-service
            port:
              number: 80
      # Document Service
      - path: /api/document
        pathType: Prefix
        backend:
          service:
            name: document-service
            port:
              number: 80
      # Financial Service
      - path: /api/financial
        pathType: Prefix
        backend:
          service:
            name: financial-service
            port:
              number: 80
      # Inventory Service
      - path: /api/inventory
        pathType: Prefix
        backend:
          service:
            name: inventory-service
            port:
              number: 80
      # Monitoring Service
      - path: /api/monitoring
        pathType: Prefix
        backend:
          service:
            name: monitoring-service
            port:
              number: 80
      # Notification Service
      - path: /api/notification
        pathType: Prefix
        backend:
          service:
            name: notification-service
            port:
              number: 80
      # Prescription Service
      - path: /api/prescription
        pathType: Prefix
        backend:
          service:
            name: prescription-service
            port:
              number: 80
      # Purchase Service
      - path: /api/purchase
        pathType: Prefix
        backend:
          service:
            name: purchase-service
            port:
              number: 80
      # Realtime Service
      - path: /api/realtime
        pathType: Prefix
        backend:
          service:
            name: realtime-service
            port:
              number: 80
      # Sales Service
      - path: /api/sales
        pathType: Prefix
        backend:
          service:
            name: sales-service
            port:
              number: 80
      # Service Management
      - path: /api/service-management
        pathType: Prefix
        backend:
          service:
            name: service-management
            port:
              number: 80
      # Default route - Auth Service
      - path: /
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 80
YAML

echo ""
echo "✅ Ingress updated with all routes!"
echo ""
echo "Waiting 30 seconds for changes to propagate..."
sleep 30

echo ""
echo "Testing new routes:"
echo "===================="
ALB_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

echo "Testing JTS Service..."
curl -s -o /dev/null -w "JTS: %{http_code}\n" "${ALB_URL}/api/jts"

echo "Testing Tenant Management..."
curl -s -o /dev/null -w "Tenant Management: %{http_code}\n" "${ALB_URL}/api/tenant"

echo "Testing Tenant Registry..."
curl -s -o /dev/null -w "Tenant Registry: %{http_code}\n" "${ALB_URL}/api/tenant-registry"

echo ""
echo "=========================================="
echo "✅ Ingress Routes Updated!"
echo "=========================================="
echo ""
echo "New routes available:"
echo "  /api/jts                  → JTS Service"
echo "  /api/tenant               → Tenant Management"
echo "  /api/tenant-management    → Tenant Management"
echo "  /api/tenant-registry      → Tenant Registry"
echo ""
echo "Wait 1-2 minutes for ALB to fully update, then test:"
echo "  curl ${ALB_URL}/api/jts"
echo "  curl ${ALB_URL}/api/tenant"
echo "  curl ${ALB_URL}/api/tenant-registry"
