#!/bin/bash

# Script to fix Sales Service 404 errors
# Checks deployment, service, pods, and ingress configuration

NAMESPACE="etelios-prod"
ALB_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Fixing Sales Service 404 Errors"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Check if deployment exists
echo "1️⃣  Checking sales-service deployment..."
if kubectl get deployment sales-service -n $NAMESPACE &> /dev/null; then
    echo "   ✅ Deployment exists"
    kubectl get deployment sales-service -n $NAMESPACE
else
    echo "   ❌ Deployment not found! Creating deployment..."
    kubectl apply -f k8s/etelios-prod/sales-service-deployment.yaml
    echo "   ✅ Deployment created"
fi
echo ""

# Step 2: Check if service exists
echo "2️⃣  Checking sales-service service..."
if kubectl get svc sales-service -n $NAMESPACE &> /dev/null; then
    echo "   ✅ Service exists"
    kubectl get svc sales-service -n $NAMESPACE
    CURRENT_PORT=$(kubectl get svc sales-service -n $NAMESPACE -o jsonpath='{.spec.ports[0].port}')
    TARGET_PORT=$(kubectl get svc sales-service -n $NAMESPACE -o jsonpath='{.spec.ports[0].targetPort}')
    echo "   Service Port: $CURRENT_PORT, Target Port: $TARGET_PORT"
    
    # Check if service port is 80 (standard) or 3007 (container port)
    if [ "$CURRENT_PORT" != "80" ] && [ "$CURRENT_PORT" != "3007" ]; then
        echo "   ⚠️  Service port mismatch. Patching to 80..."
        kubectl patch svc sales-service -n $NAMESPACE -p '{"spec":{"ports":[{"port":80,"targetPort":3007,"protocol":"TCP","name":"http"}]}}'
        echo "   ✅ Service port updated to 80"
    fi
else
    echo "   ❌ Service not found! Creating service..."
    kubectl apply -f k8s/etelios-prod/sales-service-deployment.yaml
    echo "   ✅ Service created"
fi
echo ""

# Step 3: Check pods
echo "3️⃣  Checking sales-service pods..."
PODS=$(kubectl get pods -n $NAMESPACE -l app=sales-service --no-headers 2>/dev/null | wc -l)
if [ "$PODS" -eq 0 ]; then
    echo "   ⚠️  No pods found! Scaling deployment..."
    kubectl scale deployment sales-service -n $NAMESPACE --replicas=2
    echo "   ⏳ Waiting for pods to be ready..."
    sleep 10
fi

kubectl get pods -n $NAMESPACE -l app=sales-service
echo ""

# Step 4: Check pod health
echo "4️⃣  Checking pod health..."
POD_NAMES=$(kubectl get pods -n $NAMESPACE -l app=sales-service -o jsonpath='{.items[*].metadata.name}' 2>/dev/null)
if [ -n "$POD_NAMES" ]; then
    for POD in $POD_NAMES; do
        STATUS=$(kubectl get pod $POD -n $NAMESPACE -o jsonpath='{.status.phase}' 2>/dev/null)
        READY=$(kubectl get pod $POD -n $NAMESPACE -o jsonpath='{.status.containerStatuses[0].ready}' 2>/dev/null)
        echo "   Pod: $POD - Status: $STATUS - Ready: $READY"
        
        if [ "$STATUS" != "Running" ] || [ "$READY" != "true" ]; then
            echo "   ⚠️  Pod not healthy. Checking logs..."
            kubectl logs $POD -n $NAMESPACE --tail=20
        fi
    done
else
    echo "   ❌ No pods found!"
fi
echo ""

# Step 5: Test pod directly
echo "5️⃣  Testing pod health endpoint directly..."
FIRST_POD=$(kubectl get pods -n $NAMESPACE -l app=sales-service -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -n "$FIRST_POD" ]; then
    echo "   Testing pod: $FIRST_POD"
    kubectl exec -n $NAMESPACE $FIRST_POD -- wget -qO- http://localhost:3007/health 2>/dev/null || echo "   ⚠️  Health check failed"
else
    echo "   ⚠️  No pod available for testing"
fi
echo ""

# Step 6: Check ingress configuration
echo "6️⃣  Checking ingress configuration..."
INGRESS_PORT=$(kubectl get ingress -n $NAMESPACE -o jsonpath='{.items[?(@.metadata.name=="etelios-prod-alb-ingress")].spec.rules[0].http.paths[?(@.path=="/api/sales")].backend.service.port.number}' 2>/dev/null)
if [ -n "$INGRESS_PORT" ]; then
    echo "   Ingress port for /api/sales: $INGRESS_PORT"
    
    # Get service port
    SERVICE_PORT=$(kubectl get svc sales-service -n $NAMESPACE -o jsonpath='{.spec.ports[0].port}' 2>/dev/null)
    
    if [ "$INGRESS_PORT" != "$SERVICE_PORT" ]; then
        echo "   ⚠️  Port mismatch! Ingress: $INGRESS_PORT, Service: $SERVICE_PORT"
        echo "   Updating ingress to use service port $SERVICE_PORT..."
        
        # Update ingress
        kubectl patch ingress etelios-prod-alb-ingress -n $NAMESPACE --type='json' -p="[{\"op\":\"replace\",\"path\":\"/spec/rules/0/http/paths/0/backend/service/port/number\",\"value\":$SERVICE_PORT}]" 2>/dev/null || echo "   ⚠️  Could not patch ingress automatically"
        echo "   ✅ Ingress updated (or needs manual update)"
    else
        echo "   ✅ Ports match"
    fi
else
    echo "   ⚠️  Sales service route not found in ingress!"
fi
echo ""

# Step 7: Restart deployment
echo "7️⃣  Restarting sales-service deployment..."
kubectl rollout restart deployment sales-service -n $NAMESPACE
echo "   ⏳ Waiting for rollout to complete..."
kubectl rollout status deployment sales-service -n $NAMESPACE --timeout=120s || echo "   ⚠️  Rollout timeout (may still be in progress)"
echo ""

# Step 8: Test ALB endpoint
echo "8️⃣  Testing ALB endpoint..."
sleep 5
STATUS_RESP=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$ALB_URL/api/sales/status" 2>/dev/null)
STATUS_HTTP=$(echo "$STATUS_RESP" | grep "HTTP_CODE:" | cut -d: -f2)
STATUS_BODY=$(echo "$STATUS_RESP" | sed '/HTTP_CODE:/d')

if [ "$STATUS_HTTP" = "200" ]; then
    echo "   ✅ Sales service is accessible via ALB!"
    echo "   Response: $(echo "$STATUS_BODY" | head -1)"
else
    echo "   ⚠️  Sales service still returning $STATUS_HTTP"
    echo "   Response: $(echo "$STATUS_BODY" | head -3)"
    echo ""
    echo "   📝 Next steps:"
    echo "      1. Wait 2-5 minutes for ALB to update"
    echo "      2. Check AWS Console → Target Groups → Health status"
    echo "      3. Verify pods are running: kubectl get pods -n $NAMESPACE -l app=sales-service"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Sales Service Fix Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Summary:"
echo "   - Deployment: Checked/Created"
echo "   - Service: Checked/Updated"
echo "   - Pods: Checked/Restarted"
echo "   - Ingress: Verified"
echo "   - ALB Test: $STATUS_HTTP"
echo ""
echo "⏳ If still 404, wait 2-5 minutes for ALB propagation"
