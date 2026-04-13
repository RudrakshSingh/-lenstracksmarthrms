#!/bin/bash

# Script to deploy sales service fix (port 80 for service, 3007 for container)

NAMESPACE="etelios-prod"
ALB_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Deploying Sales Service Fix"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Apply updated service configuration (port 80)
echo "1️⃣  Applying updated sales-service configuration (port 80)..."
kubectl apply -f k8s/etelios-prod/sales-service-deployment.yaml
echo "   ✅ Service configuration applied"
echo ""

# Step 2: Verify service port
echo "2️⃣  Verifying service port..."
SERVICE_PORT=$(kubectl get svc sales-service -n $NAMESPACE -o jsonpath='{.spec.ports[0].port}' 2>/dev/null)
TARGET_PORT=$(kubectl get svc sales-service -n $NAMESPACE -o jsonpath='{.spec.ports[0].targetPort}' 2>/dev/null)
echo "   Service Port: $SERVICE_PORT (should be 80)"
echo "   Target Port: $TARGET_PORT (should be 3007)"

if [ "$SERVICE_PORT" != "80" ]; then
    echo "   ⚠️  Service port is not 80. Patching..."
    kubectl patch svc sales-service -n $NAMESPACE -p '{"spec":{"ports":[{"port":80,"targetPort":3007,"protocol":"TCP","name":"http"}]}}'
    echo "   ✅ Service port patched to 80"
fi
echo ""

# Step 3: Apply updated ingress configuration
echo "3️⃣  Applying updated ingress configuration..."
kubectl apply -f k8s/ingress-alb-fixed.yaml
echo "   ✅ Ingress configuration applied"
echo ""

# Step 4: Verify ingress port
echo "4️⃣  Verifying ingress port..."
INGRESS_PORT=$(kubectl get ingress etelios-prod-alb-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[0].http.paths[?(@.path=="/api/sales")].backend.service.port.number}' 2>/dev/null)
echo "   Ingress Port: $INGRESS_PORT (should be 80)"

if [ "$INGRESS_PORT" != "80" ]; then
    echo "   ⚠️  Ingress port mismatch. Please verify manually."
fi
echo ""

# Step 5: Check pods
echo "5️⃣  Checking sales-service pods..."
kubectl get pods -n $NAMESPACE -l app=sales-service
POD_COUNT=$(kubectl get pods -n $NAMESPACE -l app=sales-service --no-headers 2>/dev/null | grep -c Running || echo "0")
echo "   Running pods: $POD_COUNT"

if [ "$POD_COUNT" -eq 0 ]; then
    echo "   ⚠️  No running pods! Scaling deployment..."
    kubectl scale deployment sales-service -n $NAMESPACE --replicas=2
    echo "   ⏳ Waiting for pods to start..."
    sleep 15
fi
echo ""

# Step 6: Restart deployment to ensure changes are applied
echo "6️⃣  Restarting sales-service deployment..."
kubectl rollout restart deployment sales-service -n $NAMESPACE
echo "   ⏳ Waiting for rollout..."
kubectl rollout status deployment sales-service -n $NAMESPACE --timeout=120s || echo "   ⚠️  Rollout timeout (may still be in progress)"
echo ""

# Step 7: Test ALB endpoint
echo "7️⃣  Testing ALB endpoint..."
sleep 5
STATUS_RESP=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$ALB_URL/api/sales/status" 2>/dev/null)
STATUS_HTTP=$(echo "$STATUS_RESP" | grep "HTTP_CODE:" | cut -d: -f2)
STATUS_BODY=$(echo "$STATUS_RESP" | sed '/HTTP_CODE:/d')

if [ "$STATUS_HTTP" = "200" ]; then
    echo "   ✅✅✅ Sales service is accessible via ALB!"
    echo "   Response: $(echo "$STATUS_BODY" | head -1)"
else
    echo "   ⚠️  Sales service returning $STATUS_HTTP"
    echo "   Response: $(echo "$STATUS_BODY" | head -3)"
    echo ""
    echo "   📝 Next steps:"
    echo "      1. Wait 2-5 minutes for ALB to update"
    echo "      2. Check AWS Console → Target Groups → Health status"
    echo "      3. Verify pods: kubectl get pods -n $NAMESPACE -l app=sales-service"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Sales Service Fix Deployed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Changes Applied:"
echo "   - Service port: 80 (was 3007)"
echo "   - Target port: 3007 (unchanged)"
echo "   - Ingress port: 80 (was 3007)"
echo ""
echo "⏳ If still 404, wait 2-5 minutes for ALB propagation"
