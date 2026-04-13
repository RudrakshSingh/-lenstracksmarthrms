#!/bin/bash

set -e

NAMESPACE="etelios-prod"
ACCOUNT_ID="383234048604"
REGION="ap-south-1"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# All services (excluding auth and hr which are already deployed)
SERVICES=(
  "analytics-service"
  "attendance-service"
  "cpp-service"
  "crm-service"
  "document-service"
  "financial-service"
  "inventory-service"
  "jts-service"
  "monitoring-service"
  "notification-service"
  "payroll-service"
  "prescription-service"
  "purchase-service"
  "realtime-service"
  "sales-service"
  "service-management"
  "tenant-management-service"
  "tenant-registry-service"
)

echo "=========================================="
echo "Deploying All Services"
echo "=========================================="

for SERVICE in "${SERVICES[@]}"; do
    echo "Deploying ${SERVICE}..."
    
    kubectl apply -f - <<YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${SERVICE}
  namespace: ${NAMESPACE}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ${SERVICE}
  template:
    metadata:
      labels:
        app: ${SERVICE}
    spec:
      containers:
      - name: ${SERVICE}
        image: ${ECR_REGISTRY}/etelios-${SERVICE}:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: etelios-config
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "250m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: ${SERVICE}
  namespace: ${NAMESPACE}
spec:
  selector:
    app: ${SERVICE}
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 3000
YAML
    
    sleep 2
done

echo ""
echo "✅ All services deployed!"
echo ""
echo "Check status:"
echo "  kubectl get pods -n ${NAMESPACE}"
echo "  kubectl get svc -n ${NAMESPACE}"
