#!/bin/bash

# Run make-users-managers.js inside auth-service pod
# This ensures we have proper DocumentDB access

echo "🔍 Finding auth-service pod..."
POD=$(kubectl get pods -n etelios-prod -l app=auth-service -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD" ]; then
  echo "❌ No auth-service pod found"
  exit 1
fi

echo "✅ Found pod: $POD"
echo "📋 Copying script to pod..."

# Copy script to pod (to service directory where node_modules exist)
kubectl cp scripts/make-users-managers.js etelios-prod/$POD:/app/make-users-managers.js

echo "🚀 Running script in pod (from /app where node_modules exist)..."
kubectl exec -n etelios-prod $POD -- sh -c "cd /app && node make-users-managers.js"

echo "🧹 Cleaning up..."
kubectl exec -n etelios-prod $POD -- rm /app/make-users-managers.js

echo "✅ Done!"
