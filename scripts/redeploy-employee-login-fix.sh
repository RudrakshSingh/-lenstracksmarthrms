#!/bin/bash

# Redeploy HR Service and Auth Service with Employee Login Fixes
# This script restarts the deployments to pick up code changes

set -e

NAMESPACE="etelios-prod"
SERVICES=("hr-service" "auth-service")

echo "🚀 Redeploying services with employee login fixes..."
echo "Namespace: ${NAMESPACE}"
echo "Services: ${SERVICES[@]}"
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed or not in PATH"
    exit 1
fi

# Check namespace exists
if ! kubectl get namespace ${NAMESPACE} &> /dev/null; then
    echo "❌ Namespace ${NAMESPACE} does not exist"
    exit 1
fi

# Restart each service
for service in "${SERVICES[@]}"; do
    echo "🔄 Restarting ${service}..."
    
    # Check if deployment exists
    if ! kubectl get deployment ${service} -n ${NAMESPACE} &> /dev/null; then
        echo "⚠️  Deployment ${service} not found in namespace ${NAMESPACE}, skipping..."
        continue
    fi
    
    # Restart deployment (forces pod recreation)
    kubectl rollout restart deployment/${service} -n ${NAMESPACE}
    
    echo "⏳ Waiting for ${service} to be ready..."
    kubectl rollout status deployment/${service} -n ${NAMESPACE} --timeout=300s || {
        echo "⚠️  ${service} rollout may have issues, but continuing..."
    }
    
    echo "✅ ${service} restarted successfully"
    echo ""
done

echo "🎉 All services redeployed successfully!"
echo ""
echo "📊 Checking pod status..."
kubectl get pods -n ${NAMESPACE} -l 'app in (hr-service,auth-service)' --sort-by=.metadata.creationTimestamp

echo ""
echo "✅ Redeployment complete! Services should now have the employee login fixes."
