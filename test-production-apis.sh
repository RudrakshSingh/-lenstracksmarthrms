#!/bin/bash

# Test Production APIs
# This script tests all endpoints against the production server

echo "🧪 Testing Production HRMS APIs"
echo "================================"
echo ""

# Production configuration
PRODUCTION_URL="https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net"

# You can override with environment variables
API_BASE_URL="${API_BASE_URL:-$PRODUCTION_URL}"
TEST_EMAIL="${TEST_EMAIL:-admin@company.com}"
TEST_PASSWORD="${TEST_PASSWORD:-password123}"

echo "Testing against: $API_BASE_URL"
echo "Using email: $TEST_EMAIL"
echo ""
echo "Note: Make sure you have valid credentials!"
echo ""

# Run tests
export API_BASE_URL="$API_BASE_URL"
export TEST_EMAIL="$TEST_EMAIL"
export TEST_PASSWORD="$TEST_PASSWORD"

node test-endpoints-simple.js

exit $?

