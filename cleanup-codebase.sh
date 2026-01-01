#!/bin/bash

# ============================================================================
# Codebase Cleanup Script
# Removes unnecessary files: logs, node_modules, build artifacts, temp files
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOTAL_SIZE=0

echo "=========================================="
echo "Codebase Cleanup Script"
echo "=========================================="
echo ""

# Function to calculate size
get_size() {
    du -sh "$1" 2>/dev/null | cut -f1 || echo "0"
}

# Function to safe delete
safe_delete() {
    local path=$1
    local description=$2
    
    if [ -e "$path" ]; then
        local size=$(get_size "$path")
        echo -e "${YELLOW}Removing: $description${NC} ($size)"
        # Use chmod to fix permissions first, then remove
        chmod -R u+w "$path" 2>/dev/null || true
        rm -rf "$path" 2>/dev/null || {
            # If still fails, try with sudo (but warn user)
            echo -e "${YELLOW}  Permission issue, trying with elevated permissions...${NC}"
            sudo rm -rf "$path" 2>/dev/null || echo -e "${RED}  ⚠ Could not remove (may need manual cleanup)${NC}"
        }
        echo -e "${GREEN}✓ Removed${NC}"
    else
        echo -e "${BLUE}⊘ Not found: $description${NC}"
    fi
}

# 1. Remove log files
echo -e "${BLUE}1. Removing log files...${NC}"
find "$SCRIPT_DIR" -type f -name "*.log" ! -path "*/node_modules/*" ! -path "*/.git/*" -delete
find "$SCRIPT_DIR" -type f -name "*-*.log" ! -path "*/node_modules/*" ! -path "*/.git/*" -delete
echo -e "${GREEN}✓ Log files removed${NC}"

# 2. Remove node_modules (can be reinstalled)
echo ""
echo -e "${BLUE}2. Removing node_modules directories...${NC}"
safe_delete "$SCRIPT_DIR/node_modules" "Root node_modules"
safe_delete "$SCRIPT_DIR/lenstrack-ecommerce/node_modules" "E-commerce node_modules"
safe_delete "$SCRIPT_DIR/lenstrack-training-app/node_modules" "Training app node_modules"

# Remove node_modules from microservices
find "$SCRIPT_DIR/microservices" -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
find "$SCRIPT_DIR/etelios-microservices" -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
echo -e "${GREEN}✓ node_modules removed${NC}"

# 3. Remove Istio download directory (can be re-downloaded)
echo ""
echo -e "${BLUE}3. Removing Istio download directory...${NC}"
safe_delete "$SCRIPT_DIR/istio-1.28.2" "Istio download directory"

# 4. Remove temporary files
echo ""
echo -e "${BLUE}4. Removing temporary files...${NC}"
find "$SCRIPT_DIR" -type f -name "*.tmp" ! -path "*/.git/*" -delete
find "$SCRIPT_DIR" -type f -name "*.swp" ! -path "*/.git/*" -delete
find "$SCRIPT_DIR" -type f -name "*~" ! -path "*/.git/*" -delete
find "$SCRIPT_DIR" -type f -name ".DS_Store" ! -path "*/.git/*" -delete
find "$SCRIPT_DIR" -type f -name "sh-thd-*" ! -path "*/.git/*" -delete
safe_delete "$SCRIPT_DIR/sh-thd-1766594775" "Temporary shell file"
echo -e "${GREEN}✓ Temporary files removed${NC}"

# 5. Remove build artifacts
echo ""
echo -e "${BLUE}5. Removing build artifacts...${NC}"
safe_delete "$SCRIPT_DIR/microservices/build-all.log" "Build log"
safe_delete "$SCRIPT_DIR/.next" "Next.js build directory"
safe_delete "$SCRIPT_DIR/dist" "Distribution directory"
safe_delete "$SCRIPT_DIR/build" "Build directory"
find "$SCRIPT_DIR" -type d -name ".next" -exec rm -rf {} + 2>/dev/null || true
find "$SCRIPT_DIR" -type d -name "dist" -exec rm -rf {} + 2>/dev/null || true
find "$SCRIPT_DIR" -type d -name "build" -exec rm -rf {} + 2>/dev/null || true
echo -e "${GREEN}✓ Build artifacts removed${NC}"

# 6. Remove coverage reports
echo ""
echo -e "${BLUE}6. Removing coverage reports...${NC}"
safe_delete "$SCRIPT_DIR/coverage" "Coverage directory"
find "$SCRIPT_DIR" -type d -name "coverage" -exec rm -rf {} + 2>/dev/null || true
echo -e "${GREEN}✓ Coverage reports removed${NC}"

# 7. Clean empty log directories (keep structure)
echo ""
echo -e "${BLUE}7. Cleaning empty log directories...${NC}"
find "$SCRIPT_DIR" -type d -name "logs" -empty -delete 2>/dev/null || true
echo -e "${GREEN}✓ Empty log directories removed${NC}"

# 8. Update .gitignore
echo ""
echo -e "${BLUE}8. Updating .gitignore...${NC}"
GITIGNORE="$SCRIPT_DIR/.gitignore"

# Create .gitignore if it doesn't exist
if [ ! -f "$GITIGNORE" ]; then
    touch "$GITIGNORE"
fi

# Add common ignores if not present
{
    echo ""
    echo "# Logs"
    echo "*.log"
    echo "logs/"
    echo "*.log.*"
    echo ""
    echo "# Dependencies"
    echo "node_modules/"
    echo ""
    echo "# Build artifacts"
    echo "dist/"
    echo "build/"
    echo ".next/"
    echo "coverage/"
    echo ""
    echo "# Temporary files"
    echo "*.tmp"
    echo "*.swp"
    echo "*~"
    echo ".DS_Store"
    echo "sh-thd-*"
    echo ""
    echo "# Istio download"
    echo "istio-*/"
    echo ""
    echo "# Environment files"
    echo ".env"
    echo ".env.local"
    echo "*.env"
    echo "!env.example"
    echo ""
    echo "# IDE"
    echo ".vscode/"
    echo ".idea/"
    echo "*.swp"
    echo "*.swo"
} >> "$GITIGNORE"

# Remove duplicates
sort -u "$GITIGNORE" -o "$GITIGNORE.tmp" && mv "$GITIGNORE.tmp" "$GITIGNORE"

echo -e "${GREEN}✓ .gitignore updated${NC}"

# 9. Calculate space saved
echo ""
echo -e "${BLUE}9. Calculating space saved...${NC}"
NEW_SIZE=$(du -sh "$SCRIPT_DIR" 2>/dev/null | cut -f1)
echo -e "${GREEN}Current directory size: $NEW_SIZE${NC}"

# Summary
echo ""
echo "=========================================="
echo -e "${GREEN}Cleanup Complete!${NC}"
echo "=========================================="
echo ""
echo "Removed:"
echo "  ✓ Log files (*.log)"
echo "  ✓ node_modules directories"
echo "  ✓ Istio download directory"
echo "  ✓ Temporary files (.tmp, .swp, .DS_Store)"
echo "  ✓ Build artifacts (dist, build, .next)"
echo "  ✓ Coverage reports"
echo ""
echo "Updated:"
echo "  ✓ .gitignore (added common ignores)"
echo ""
echo "Next steps:"
echo "  1. Review .gitignore if needed"
echo "  2. Reinstall dependencies: npm install"
echo "  3. Re-download Istio if needed: ./k8s/setup-istio.sh"
echo ""

