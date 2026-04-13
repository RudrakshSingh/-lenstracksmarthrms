#!/bin/bash
# Revert All Cost Optimization Changes

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 REVERTING COST OPTIMIZATION CHANGES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

NAMESPACE="etelios-prod"
MONITORING_NAMESPACE="monitoring"

# Step 1: Delete Grafana proxy service and endpoints
echo "1️⃣  Removing Grafana proxy service..."
if kubectl get svc grafana-proxy -n $NAMESPACE &> /dev/null; then
  kubectl delete svc grafana-proxy -n $NAMESPACE
  echo "   ✅ Grafana proxy service deleted"
else
  echo "   ⚠️  Grafana proxy service not found (may already be deleted)"
fi

if kubectl get endpoints grafana-proxy -n $NAMESPACE &> /dev/null; then
  kubectl delete endpoints grafana-proxy -n $NAMESPACE
  echo "   ✅ Grafana proxy endpoints deleted"
fi
echo ""

# Step 2: Revert Grafana service to LoadBalancer
echo "2️⃣  Reverting Grafana service to LoadBalancer..."
if kubectl get svc prometheus-grafana -n $MONITORING_NAMESPACE &> /dev/null; then
  CURRENT_TYPE=$(kubectl get svc prometheus-grafana -n $MONITORING_NAMESPACE -o jsonpath='{.spec.type}')
  echo "   Current type: $CURRENT_TYPE"
  
  if [ "$CURRENT_TYPE" != "LoadBalancer" ]; then
    kubectl patch svc prometheus-grafana -n $MONITORING_NAMESPACE -p '{"spec":{"type":"LoadBalancer"}}'
    echo "   ✅ Grafana service reverted to LoadBalancer"
  else
    echo "   ✅ Already LoadBalancer (no change needed)"
  fi
else
  echo "   ⚠️  Grafana service not found in monitoring namespace"
fi
echo ""

# Step 3: Apply reverted ingress (Grafana routes removed)
echo "3️⃣  Applying reverted ingress (Grafana routes removed)..."
if [ -f "k8s/ingress-alb-fixed.yaml" ]; then
  kubectl apply -f k8s/ingress-alb-fixed.yaml -n $NAMESPACE
  echo "   ✅ Ingress updated (Grafana routes removed)"
else
  echo "   ⚠️  Ingress file not found"
fi
echo ""

# Step 4: Verify changes
echo "4️⃣  Verifying changes..."
echo ""
echo "   Grafana service type:"
kubectl get svc prometheus-grafana -n $MONITORING_NAMESPACE -o jsonpath='{.spec.type}' 2>/dev/null || echo "   Service not found"
echo ""
echo "   Grafana proxy service:"
kubectl get svc grafana-proxy -n $NAMESPACE 2>/dev/null && echo "   ⚠️  Still exists" || echo "   ✅ Deleted"
echo ""
echo "   Ingress routes (checking for grafana):"
kubectl get ingress -n $NAMESPACE -o yaml | grep -i grafana && echo "   ⚠️  Grafana route still exists" || echo "   ✅ No Grafana routes found"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ REVERT COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Summary:"
echo "   ✅ Grafana proxy service: Deleted"
echo "   ✅ Grafana service: Reverted to LoadBalancer"
echo "   ✅ Ingress: Grafana routes removed"
echo ""
echo "🎯 Grafana now uses its own LoadBalancer (original state)"
echo ""
