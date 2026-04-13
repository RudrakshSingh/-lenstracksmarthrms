#!/bin/bash

# Deployment script for Tenant Admin Dashboard endpoints
# This script commits and pushes the dashboard changes to production

set -e

echo "🚀 Deploying Tenant Admin Dashboard endpoints to production..."

# Navigate to project root
cd "$(dirname "$0")/.."

# Check if we're on the right branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Warning: Not on main branch. Continue anyway? (y/n)"
    read -r response
    if [ "$response" != "y" ]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

# Stage the dashboard files
echo "📦 Staging dashboard files..."
git add microservices/hr-service/src/controllers/dashboardController.js
git add microservices/hr-service/src/routes/dashboard.routes.js
git add microservices/hr-service/src/server.js
git add scripts/test-tenant-admin-dashboard.js

# Show what will be committed
echo ""
echo "📋 Files to be committed:"
git status --short

# Commit
echo ""
echo "💾 Committing changes..."
git commit -m "feat: Add Tenant Admin Dashboard endpoints (stats, top-performers, top-sales, recent-activities)

- Added getDashboardStats with all 15+ required fields
- Added getTopPerformers endpoint
- Added getTopSales endpoint  
- Updated getRecentActivities to match spec format
- Mounted routes at /api/dashboard for tenant admin dashboard
- All endpoints support X-Tenant-Id header for tenant isolation"

# Push to origin
echo ""
echo "📤 Pushing to origin/main..."
git push origin main

echo ""
echo "✅ Code pushed successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Wait for CI/CD pipeline to build and deploy hr-service"
echo "   2. Run test script: node scripts/test-tenant-admin-dashboard.js"
echo "   3. Verify endpoints in production"
echo ""
echo "🧪 To test locally first:"
echo "   TEST_TOKEN=your-token TENANT_ID=lenstrack node scripts/test-tenant-admin-dashboard.js"
