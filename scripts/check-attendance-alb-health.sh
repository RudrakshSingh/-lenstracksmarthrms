#!/bin/bash
# Check ALB Target Group Health for Attendance Service

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Checking ALB Target Group Health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

NAMESPACE="etelios-prod"
SERVICE_NAME="attendance-service"

# Step 1: Check service endpoints
echo "1️⃣  Checking Service Endpoints..."
echo ""
kubectl get endpoints -n $NAMESPACE $SERVICE_NAME

echo ""
echo "2️⃣  Checking Service Details..."
kubectl get svc -n $NAMESPACE $SERVICE_NAME -o yaml | grep -A 10 "ports:"

echo ""
echo "3️⃣  Checking Pod IPs and Ports..."
PODS=$(kubectl get pods -n $NAMESPACE -l app=$SERVICE_NAME -o jsonpath='{.items[*].metadata.name}')

for POD in $PODS; do
  echo ""
  echo "   Pod: $POD"
  POD_IP=$(kubectl get pod $POD -n $NAMESPACE -o jsonpath='{.status.podIP}')
  echo "   IP: $POD_IP"
  
  # Check if pod is ready
  READY=$(kubectl get pod $POD -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')
  echo "   Ready: $READY"
  
  # Check container port
  PORT=$(kubectl get pod $POD -n $NAMESPACE -o jsonpath='{.spec.containers[0].ports[0].containerPort}')
  echo "   Container Port: $PORT"
  
  # Try to exec into pod and check health
  echo "   Testing health endpoint..."
  HEALTH=$(kubectl exec -n $NAMESPACE $POD -- curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/health 2>/dev/null || echo "000")
  echo "   Health Check: $HEALTH"
done

echo ""
echo "4️⃣  Checking Ingress Configuration..."
kubectl get ingress -n $NAMESPACE -o yaml | grep -A 20 "attendance" || echo "   No specific ingress rule found"

echo ""
echo "5️⃣  Checking ALB Target Group Binding..."
kubectl get targetgroupbinding -n $NAMESPACE 2>/dev/null | grep attendance || echo "   No target group binding found"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Next Steps:"
echo "   1. Verify service endpoints have pod IPs"
echo "   2. Check ALB target group in AWS Console"
echo "   3. Verify health check path is correct"
echo "   4. Check if pods are responding on port 3003"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
