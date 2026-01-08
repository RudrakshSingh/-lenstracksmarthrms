#!/bin/bash

# Wait for deployment to complete and register endpoint to be available

echo "🔄 Waiting for deployment to complete..."
echo ""
echo "Checking if /api/auth/register endpoint is available..."
echo ""

MAX_ATTEMPTS=60
ATTEMPT=0
SLEEP_SECONDS=10

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    
    # Check if register endpoint exists
    RESPONSE=$(curl -k -s -X POST "https://98.70.245.87/api/auth/register" \
        -H "Host: api.etelios.com" \
        -H "Content-Type: application/json" \
        -d '{"test":"check"}' 2>&1)
    
    if echo "$RESPONSE" | grep -q "Route not found"; then
        echo "[$ATTEMPT/$MAX_ATTEMPTS] ⏳ Deployment in progress... (waiting ${SLEEP_SECONDS}s)"
    elif echo "$RESPONSE" | grep -q "Validation failed"; then
        echo ""
        echo "✅ Deployment complete! Register endpoint is now available."
        echo ""
        echo "🎯 Next step: Create admin user"
        echo ""
        echo "Run this command:"
        echo ""
        echo "curl -k -X POST \"https://98.70.245.87/api/auth/register\" \\"
        echo "  -H \"Host: api.etelios.com\" \\"
        echo "  -H \"Content-Type: application/json\" \\"
        echo "  -d '{"
        echo "    \"employee_id\": \"ADMIN-001\","
        echo "    \"name\": \"System Administrator\","
        echo "    \"email\": \"admin@etelios.com\","
        echo "    \"phone\": \"+919999999999\","
        echo "    \"password\": \"Admin@123456\","
        echo "    \"role\": \"admin\","
        echo "    \"department\": \"TECH\","
        echo "    \"designation\": \"System Administrator\""
        echo "  }'"
        echo ""
        exit 0
    else
        echo ""
        echo "⚠️  Unexpected response: $RESPONSE"
    fi
    
    sleep $SLEEP_SECONDS
done

echo ""
echo "❌ Timeout: Deployment did not complete in $((MAX_ATTEMPTS * SLEEP_SECONDS / 60)) minutes"
echo ""
echo "Check deployment status:"
echo "- Azure DevOps: https://dev.azure.com/Hindempire-devops1/etelios/_build"
echo "- kubectl get pods -n etelios-backend-prod -l app=auth-service"
echo ""
exit 1

