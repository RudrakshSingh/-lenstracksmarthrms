#!/bin/bash

# Check Deployment Status
# This script checks the status of attendance-service deployment

echo "=========================================="
echo "📊 Checking Attendance Service Deployment Status"
echo "=========================================="

NAMESPACE="etelios-prod"
SERVICE="attendance-service"

echo ""
echo "1️⃣  Checking Deployment Status..."
kubectl get deployment ${SERVICE} -n ${NAMESPACE} -o wide

echo ""
echo "2️⃣  Checking Pods..."
kubectl get pods -n ${NAMESPACE} -l app=${SERVICE}

echo ""
echo "3️⃣  Checking Pod Events (last 10)..."
kubectl get events -n ${NAMESPACE} --sort-by='.lastTimestamp' | grep ${SERVICE} | tail -10

echo ""
echo "4️⃣  Checking Recent Pod Logs..."
POD_NAME=$(kubectl get pods -n ${NAMESPACE} -l app=${SERVICE} -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ ! -z "$POD_NAME" ]; then
    echo "Pod: $POD_NAME"
    kubectl logs -n ${NAMESPACE} ${POD_NAME} --tail=30 | grep -i "scheduler\|cron\|error\|started" || echo "No relevant logs found"
else
    echo "No pods found"
fi

echo ""
echo "5️⃣  Checking Rollout Status..."
kubectl rollout status deployment/${SERVICE} -n ${NAMESPACE} --timeout=10s 2>&1 || echo "Rollout still in progress or timed out"

echo ""
echo "=========================================="
echo "✅ Status Check Complete"
echo "=========================================="
