#!/bin/bash

set -e

NAMESPACE="etelios-prod"

echo "=========================================="
echo "Updating Ingress with Correct Routes"
echo "=========================================="
echo ""
echo "JTS Service is an API Gateway!"
echo "Tenant Registry: /api/tenants"
echo "Tenant Management: /api/admin/v1"
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
      # Admin routes (Tenant Management)
      - path: /api/admin
        pathType: Prefix
        backend:
          service:
            name: tenant-management-service
            port:
              number: 80
      # Tenant Registry (via JTS Gateway)
      - path: /api/tenants
        pathType: Prefix
        backend:
          service:
            name: jts-service
            port:
              number: 80
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
      # All other /api routes go to JTS Gateway
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: jts-service
            port:
              number: 80
      # Health check
      - path: /health
        pathType: Prefix
        backend:
          service:
            name: jts-service
            port:
              number: 80
      # Default route - JTS Gateway
      - path: /
        pathType: Prefix
        backend:
          service:
            name: jts-service
            port:
              number: 80
YAML

echo "✅ Ingress updated!"
echo ""
echo "Waiting 30 seconds..."
sleep 30

ALB_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

echo ""
echo "Testing endpoints..."
echo "===================="

echo "Root (Gateway):"
curl -s "${ALB_URL}/" | python3 -m json.tool 2>/dev/null | head -3
echo ""

echo "Health:"
curl -s "${ALB_URL}/health" | python3 -m json.tool 2>/dev/null | head -3
echo ""

echo "Auth Status:"
curl -s "${ALB_URL}/api/auth/status" | python3 -m json.tool 2>/dev/null | head -3
echo ""

echo "HR Status:"
curl -s "${ALB_URL}/api/hr/status" | python3 -m json.tool 2>/dev/null | head -3
echo ""

echo "Tenants (Tenant Registry):"
STATUS=$(curl -s -o /dev/null -w '%{http_code}' "${ALB_URL}/api/tenants")
echo "HTTP $STATUS"
echo ""

echo "Admin (Tenant Management):"
STATUS=$(curl -s -o /dev/null -w '%{http_code}' "${ALB_URL}/api/admin/v1")
echo "HTTP $STATUS"

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
