#!/bin/bash

NAMESPACE="etelios-prod"

echo "=========================================="
echo "STEP 7: Test Connection from Debug Pod"
echo "=========================================="
echo ""

# Load DocumentDB credentials
LATEST_DAY2=$(ls -t aws-resources-day2-*.txt 2>/dev/null | head -n 1)
DOCDB_ENDPOINT=$(grep "^DOCDB_ENDPOINT=" "$LATEST_DAY2" | cut -d'=' -f2)
DOCDB_USER=$(grep "^DOCDB_MASTER_USER=" "$LATEST_DAY2" | cut -d'=' -f2)
DOCDB_PASSWORD=$(grep "^DOCDB_MASTER_PASSWORD=" "$LATEST_DAY2" | cut -d'=' -f2)

echo "Testing connection with mongo client..."
echo ""

# Create debug pod with mongo client and certificate
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: mongo-debug
  namespace: $NAMESPACE
spec:
  containers:
  - name: mongo
    image: mongo:5.0
    command: ['sh', '-c', '
      echo "Downloading certificate...";
      wget -O /tmp/rds-ca-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem 2>/dev/null;
      echo "Testing connection...";
      mongosh "mongodb://'$DOCDB_USER':'$DOCDB_PASSWORD'@'$DOCDB_ENDPOINT':27017/?tls=true&tlsCAFile=/tmp/rds-ca-bundle.pem&replicaSet=rs0" --eval "db.adminCommand({ping: 1})" 2>&1;
      echo "Keeping pod alive for manual testing...";
      sleep 3600
    ']
  restartPolicy: Never
EOF

echo "Waiting for test to complete (30 seconds)..."
sleep 30

echo ""
echo "Test Results:"
kubectl logs -n $NAMESPACE mongo-debug 2>&1 | tail -n 20

echo ""
echo "=========================================="
echo "Analysis:"
echo "=========================================="
echo ""

LOGS=$(kubectl logs -n $NAMESPACE mongo-debug 2>&1)

if echo "$LOGS" | grep -q "ok.*1"; then
    echo "✅ SUCCESS! Connection works!"
    echo "   DocumentDB is accessible from pods"
elif echo "$LOGS" | grep -qi "authentication failed"; then
    echo "❌ Authentication failed"
    echo "   Wrong username or password"
elif echo "$LOGS" | grep -qi "timeout\|ETIMEDOUT"; then
    echo "❌ Connection timeout"
    echo "   Network/security group issue"
elif echo "$LOGS" | grep -qi "ENOTFOUND\|EAI_AGAIN"; then
    echo "❌ DNS resolution failed"
    echo "   DNS or endpoint issue"
else
    echo "⚠️  Unknown error - check logs above"
fi

echo ""
echo "Manual test (if needed):"
echo "  kubectl exec -it -n $NAMESPACE mongo-debug -- bash"
echo "  Then run: mongosh \"mongodb://$DOCDB_USER:PASSWORD@$DOCDB_ENDPOINT:27017/?tls=true&tlsAllowInvalidCertificates=true\""
echo ""

echo "Cleanup:"
echo "  kubectl delete pod mongo-debug -n $NAMESPACE"
echo ""
echo "Next: ./step8-inject-configmap.sh"
