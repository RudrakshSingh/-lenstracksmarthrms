#!/bin/bash

# API Endpoints Test Runner
# This script tests all HRMS API endpoints

echo "🧪 HRMS API Endpoints Test Runner"
echo "=================================="
echo ""

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3002}"
TEST_EMAIL="${TEST_EMAIL:-admin@company.com}"
TEST_PASSWORD="${TEST_PASSWORD:-password123}"

echo "Configuration:"
echo "  Base URL: $API_BASE_URL"
echo "  Test Email: $TEST_EMAIL"
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js to run tests."
    exit 1
fi

# Check if service is running
echo "Checking if service is running..."
if curl -s -f "$API_BASE_URL/health" > /dev/null 2>&1; then
    echo "✅ Service is running"
else
    echo "⚠️  Service health check failed. Continuing anyway..."
fi

echo ""
echo "Starting tests..."
echo ""

# Run the simple test script (no external dependencies)
export API_BASE_URL="$API_BASE_URL"
export TEST_EMAIL="$TEST_EMAIL"
export TEST_PASSWORD="$TEST_PASSWORD"

node test-endpoints-simple.js

exit_code=$?

echo ""
if [ $exit_code -eq 0 ]; then
    echo "✅ All tests completed successfully!"
else
    echo "❌ Some tests failed. Check the output above for details."
fi

exit $exit_code

