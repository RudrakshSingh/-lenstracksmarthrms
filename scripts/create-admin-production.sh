#!/bin/bash

# Script to create admin user in production database
# This should be run on the production server or via Azure Cloud Shell

echo "🚀 Creating Admin User in Production Database"
echo "=============================================="
echo ""
echo "⚠️  This script should be run on the production server"
echo "    OR via Azure Cloud Shell with access to Cosmos DB"
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "scripts/create-real-admin.js" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo "✅ Running admin user creation script..."
echo ""

# Run the script
node scripts/create-real-admin.js

echo ""
echo "✅ Script completed!"
echo ""
echo "📋 Next Steps:"
echo "   1. Login via API: POST /api/auth/login"
echo "   2. Use credentials: admin@etelios.com / Admin@123456"
echo "   3. Get production token from login response"
echo "   4. Use token for all API requests"
echo ""

