#!/bin/bash

###############################################################################
# Apply Database Optimizations to All Services
# This script updates all services to use optimized database connections
###############################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "🚀 Applying Database Optimizations"
echo "=========================================="
echo ""

SERVICES=(
  "hr-service"
  "payroll-service"
  "attendance-service"
  "auth-service"
  "tenant-registry-service"
)

SHARED_UTILS_DIR="microservices/shared/utils"

# Check if shared utils exist
if [ ! -d "$SHARED_UTILS_DIR" ]; then
  echo -e "${RED}❌ Shared utils directory not found${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Shared utils directory found${NC}"
echo ""

# Function to update service database connection
update_service_connection() {
  local service=$1
  local service_dir="microservices/$service"
  local server_file="$service_dir/src/server.js"
  
  if [ ! -f "$server_file" ]; then
    echo -e "${YELLOW}⚠️  $service: server.js not found, skipping${NC}"
    return
  fi

  echo "Processing: $service"
  echo "----------------------------------------"
  
  # Check if already using optimized connection
  if grep -q "getOptimizedConnection" "$server_file"; then
    echo -e "${YELLOW}⚠️  $service: Already using optimized connection${NC}"
    return
  fi

  # Backup original file
  cp "$server_file" "$server_file.backup"
  echo -e "${GREEN}✅ Backup created: $server_file.backup${NC}"

  # Note: Manual update required - show instructions
  echo -e "${YELLOW}📝 Manual update required for $service${NC}"
  echo "  1. Replace connectDB() with getOptimizedConnection()"
  echo "  2. Add executeWithTimeout() to queries"
  echo "  3. See DATABASE_OPTIMIZATION_GUIDE.md for details"
  echo ""
}

# Update all services
for service in "${SERVICES[@]}"; do
  update_service_connection "$service"
done

echo "=========================================="
echo "✅ Optimization Check Complete"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Review DATABASE_OPTIMIZATION_GUIDE.md"
echo "2. Update each service's connectDB() function"
echo "3. Add executeWithTimeout() to all queries"
echo "4. Test and deploy"
echo ""
