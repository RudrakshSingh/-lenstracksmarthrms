#!/bin/bash

# Check and deploy analytics-service if not running

set -e

NAMESPACE="etelios-prod"
SERVICE="analytics-service"

echo "🔍 Checking analytics-service status..."
echo ""

# Check if deployment exists
if kubectl get deployment "$SERVICE" -n "$NAMESPACE" &>/dev/null; then
    echo "✅ Deployment exists"
    
    # Check pod status
    PODS=$(kubectl get pods -n "$NAMESPACE" -l app="$SERVICE" --no-headers 2>/dev/null | wc -l | tr -d ' ')
    
    if [ "$PODS" -eq "0" ]; then
        echo "❌ No pods running"
        echo "🚀 Deploying analytics-service..."
        kubectl apply -f "k8s/etelios-prod/${SERVICE}-deployment.yaml" -n "$NAMESPACE"
        echo "⏳ Waiting for pods to be ready..."
        kubectl rollout status deployment/"$SERVICE" -n "$NAMESPACE" --timeout=120s || echo "⚠️  Rollout timeout"
    else
        echo "📊 Pod status:"
        kubectl get pods -n "$NAMESPACE" -l app="$SERVICE"
        
        # Check if pods are running
        RUNNING=$(kubectl get pods -n "$NAMESPACE" -l app="$SERVICE" --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')
        
        if [ "$RUNNING" -eq "0" ]; then
            echo "❌ No pods in Running state"
            echo "🔄 Restarting deployment..."
            kubectl rollout restart deployment/"$SERVICE" -n "$NAMESPACE"
            echo "⏳ Waiting for rollout..."
            kubectl rollout status deployment/"$SERVICE" -n "$NAMESPACE" --timeout=120s || echo "⚠️  Rollout timeout"
        else
            echo "✅ $RUNNING pod(s) running"
        fi
    fi
else
    echo "❌ Deployment not found"
    echo "🚀 Creating analytics-service deployment..."
    kubectl apply -f "k8s/etelios-prod/${SERVICE}-deployment.yaml" -n "$NAMESPACE"
    echo "⏳ Waiting for deployment..."
    kubectl rollout status deployment/"$SERVICE" -n "$NAMESPACE" --timeout=120s || echo "⚠️  Rollout timeout"
fi

echo ""
echo "📋 Final Status:"
kubectl get pods -n "$NAMESPACE" -l app="$SERVICE"
echo ""
echo "📋 Service:"
kubectl get svc -n "$NAMESPACE" "$SERVICE" || echo "❌ Service not found"
