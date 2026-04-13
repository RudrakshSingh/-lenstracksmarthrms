#!/bin/bash

set -e

NAMESPACE="etelios-prod"

echo "=========================================="
echo "Configuring Direct Ingress (No Gateway)"
echo "=========================================="
echo ""
echo "Removing API Gateway pattern..."
echo "Each service will be directly accessible via Ingress"
echo ""

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
      # Auth Service - Most specific routes first
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
      # Tenant Management (Admin)
      - path: /api/admin
        pathType: Prefix
        backend:
          service:
            name: tenant-management-service
            port:
              number: 80
      # Tenant Registry
      - path: /api/tenants
        pathType: Prefix
        backend:
          service:
            name: tenant-registry-service
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
      - path: /api/documents
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
      # JTS Service (direct access, no gateway role)
      - path: /api/jts
        pathType: Prefix
        backend:
          service:
            name: jts-service
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
      - path: /api/service
        pathType: Prefix
        backend:
          service:
            name: service-management
            port:
              number: 80
      # CPP Service
      - path: /api/cpp
        pathType: Prefix
        backend:
          service:
            name: cpp-service
            port:
              number: 80
      # Default route - Auth Service (for login page, etc.)
      - path: /
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 80
YAML

echo "✅ Ingress configured for direct service access!"
echo ""
echo "Waiting 30 seconds for ALB to update..."
sleep 30

echo ""
echo "Testing direct service access..."
echo "================================"
ALB_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

echo "Auth Service:"
curl -s -o /dev/null -w "  HTTP %{http_code}\n" "${ALB_URL}/api/auth/status"

echo "HR Service:"
curl -s -o /dev/null -w "  HTTP %{http_code}\n" "${ALB_URL}/api/hr/status"

echo "Attendance Service:"
curl -s -o /dev/null -w "  HTTP %{http_code}\n" "${ALB_URL}/api/attendance/status"

echo "Tenant Management:"
curl -s -o /dev/null -w "  HTTP %{http_code}\n" "${ALB_URL}/api/admin/v1"

echo ""
echo "=========================================="
echo "✅ Direct Ingress Configuration Complete!"
echo "=========================================="
echo ""
echo "All services are now directly accessible via Ingress"
echo "No API Gateway intermediary"
echo ""
echo "Test services:"
echo "  curl ${ALB_URL}/api/auth/status"
echo "  curl ${ALB_URL}/api/hr"
echo "  curl ${ALB_URL}/api/admin/v1"
