#!/bin/bash

set -e

echo "=========================================="
echo "DocumentDB Complete Debug & Fix"
echo "=========================================="
echo "Running all 10 steps automatically..."
echo ""

# Step 1
echo "▶️  STEP 1/10: Verify DocumentDB"
./step1-verify-documentdb.sh
echo ""
read -p "Press Enter to continue to Step 2..."

# Step 2
echo "▶️  STEP 2/10: Fix Subnets"
./step2-fix-subnets.sh
echo ""
read -p "Press Enter to continue to Step 3..."

# Step 3
echo "▶️  STEP 3/10: Fix Security Groups"
./step3-fix-all-security-groups.sh
echo ""
read -p "Press Enter to continue to Step 4..."

# Step 4
echo "▶️  STEP 4/10: Test DNS Resolution"
./step4-test-dns-resolution.sh
echo ""
read -p "Press Enter to continue to Step 5..."

echo "First 4 steps complete!"
echo ""
echo "Remaining steps will be created as we proceed..."
echo "Continue with step 5-10 scripts creation"
