#!/bin/bash

NAMESPACE="etelios-prod"
REGION="ap-south-1"

echo "=========================================="
echo "Final Diagnostic - Find Root Cause"
echo "=========================================="
echo ""

# 1. Check DocumentDB cluster status
echo "1️⃣  Checking DocumentDB Cluster Status..."
DOCDB_STATUS=$(aws docdb describe-db-clusters \
    --db-cluster-identifier etelios-docdb-cluster \
    --query 'DBClusters[0].Status' \
    --output text --region $REGION 2>/dev/null || echo "ERROR")

echo "   DocumentDB Status: $DOCDB_STATUS"

if [ "$DOCDB_STATUS" != "available" ]; then
    echo "   ❌ DocumentDB NOT available - this is the problem!"
    echo "   Cluster needs to be 'available' for connections to work"
    echo ""
    echo "   Solution: Wait for DocumentDB to finish creating"
    echo "   Check: https://console.aws.amazon.com/docdb/home?region=$REGION"
    exit 1
fi

echo "   ✅ DocumentDB is available"
echo ""

# 2. Check security group rules
echo "2️⃣  Checking Security Group Rules..."
DOCDB_SG=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=etelios-docdb-sg" \
    --query 'SecurityGroups[0].GroupId' \
    --output text --region $REGION 2>/dev/null)

RULES=$(aws ec2 describe-security-groups \
    --group-ids $DOCDB_SG \
    --query 'SecurityGroups[0].IpPermissions[?ToPort==`27017`]' \
    --output json --region $REGION 2>/dev/null | jq length)

echo "   DocumentDB SG: $DOCDB_SG"
echo "   Port 27017 rules: $RULES"

if [ "$RULES" -lt 1 ]; then
    echo "   ❌ No rules allowing port 27017!"
else
    echo "   ✅ Security rules configured"
fi
echo ""

# 3. Check pods
echo "3️⃣  Checking Pod Status..."
kubectl get pods -n $NAMESPACE -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,READY:.status.containerStatuses[0].ready | head -n 10
echo ""

# 4. Check one pod's logs in detail
echo "4️⃣  Checking Pod Logs..."
FIRST_POD=$(kubectl get pods -n $NAMESPACE -o name 2>/dev/null | head -n 1 | cut -d'/' -f2)
if [ -n "$FIRST_POD" ]; then
    echo "   Pod: $FIRST_POD"
    echo "   Last 15 lines:"
    kubectl logs -n $NAMESPACE $FIRST_POD --tail=15 2>&1 | head -n 20
fi
echo ""

# 5. Summary
echo "=========================================="
echo "Summary & Next Steps"
echo "=========================================="
echo ""

READY=$(kubectl get pods -n $NAMESPACE -o jsonpath='{range .items[*]}{.status.containerStatuses[0].ready}{"\n"}{end}' 2>/dev/null | grep -c "true" || echo "0")
TOTAL=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | wc -l | tr -d ' ')

echo "Pods Ready: $READY / $TOTAL"
echo ""

if [ "$READY" -ge 15 ]; then
    echo "✅ Most services ready! Test:"
    echo "   curl http://a0adb495fa82c42bfafa50a3552b78dd-1883230600.ap-south-1.elb.amazonaws.com/health"
elif [ "$READY" -gt 5 ]; then
    echo "⚠️  Some services ready, others still connecting"
    echo "   Wait 5 more minutes"
else
    echo "❌ Services not connecting to DocumentDB"
    echo ""
    echo "Possible causes:"
    echo "  1. DocumentDB still initializing"
    echo "  2. Wrong connection string"
    echo "  3. Network routing issue"
    echo ""
    echo "Check ConfigMap:"
    echo "   kubectl get configmap etelios-config -n $NAMESPACE -o yaml"
fi

echo ""
