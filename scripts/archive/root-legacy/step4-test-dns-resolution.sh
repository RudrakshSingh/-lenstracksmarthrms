#!/bin/bash

NAMESPACE="etelios-prod"
REGION="ap-south-1"

echo "=========================================="
echo "STEP 4: Test DNS Resolution from Pods"
echo "=========================================="
echo ""

# Get DocumentDB endpoint
LATEST_DAY2=$(ls -t aws-resources-day2-*.txt 2>/dev/null | head -n 1)
DOCDB_ENDPOINT=$(grep "^DOCDB_ENDPOINT=" "$LATEST_DAY2" | cut -d'=' -f2)

echo "DocumentDB Endpoint: $DOCDB_ENDPOINT"
echo ""

# Create debug pod with network tools
echo "Creating debug pod with network tools..."

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: network-debug
  namespace: $NAMESPACE
spec:
  containers:
  - name: debug
    image: nicolaka/netshoot
    command: ['sh', '-c', 'sleep 3600']
  restartPolicy: Never
EOF

echo "Waiting for debug pod to be ready..."
kubectl wait --for=condition=Ready pod/network-debug -n $NAMESPACE --timeout=60s 2>/dev/null || sleep 30

echo ""
echo "=== DNS Resolution Test ==="
kubectl exec -n $NAMESPACE network-debug -- nslookup $DOCDB_ENDPOINT 2>&1

echo ""
echo "=== Ping Test ==="
kubectl exec -n $NAMESPACE network-debug -- ping -c 3 $DOCDB_ENDPOINT 2>&1 || echo "Ping may be blocked (normal)"

echo ""
echo "=== Port 27017 Connectivity Test ==="
kubectl exec -n $NAMESPACE network-debug -- nc -zv $DOCDB_ENDPOINT 27017 2>&1

echo ""
echo "=== Telnet Test ==="
kubectl exec -n $NAMESPACE network-debug -- telnet $DOCDB_ENDPOINT 27017 2>&1 | head -n 5 || echo "Telnet test done"

echo ""

# Cleanup
echo "Cleaning up debug pod..."
kubectl delete pod network-debug -n $NAMESPACE --force --grace-period=0 &>/dev/null || true

echo ""
echo "=========================================="
echo "STEP 4: Analysis"
echo "=========================================="
echo ""
echo "If DNS resolved and port connected:"
echo "  ✅ Network is working"
echo "  Issue is likely: credentials, TLS, or connection string"
echo ""
echo "If DNS failed:"
echo "  ❌ DNS issue - check CoreDNS or VPC DNS settings"
echo ""
echo "If port connection failed:"
echo "  ❌ Security group or routing issue"
echo ""
echo "Next: ./step5-fix-connection-string.sh"
