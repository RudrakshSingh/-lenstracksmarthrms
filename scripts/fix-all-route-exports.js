#!/usr/bin/env node

/**
 * Fix All Route File Exports
 * Ensures all route files properly export router
 */

const fs = require('fs');
const path = require('path');

function findRouteFiles(dir) {
  const routeFiles = [];
  
  function walkDir(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    
    const files = fs.readdirSync(currentDir);
    files.forEach(file => {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.includes('node_modules')) {
        walkDir(filePath);
      } else if (file.endsWith('.routes.js') || file.endsWith('.route.js')) {
        routeFiles.push(filePath);
      }
    });
  }
  
  walkDir(dir);
  return routeFiles;
}

const servicesDir = path.join(__dirname, '..', 'microservices');
const allRouteFiles = findRouteFiles(servicesDir);

console.log(`\n🔧 Checking ${allRouteFiles.length} route files...\n`);

let fixedCount = 0;
let checkedCount = 0;

allRouteFiles.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    checkedCount++;

    // Check if file has module.exports
    if (!content.includes('module.exports')) {
      // Check if it has router defined
      if (content.includes('const router') || content.includes('var router')) {
        // Add export at the end
        const newContent = content.trim() + '\n\nmodule.exports = router;';
        fs.writeFileSync(filePath, newContent);
        fixedCount++;
        console.log(`✅ Fixed: ${path.relative(servicesDir, filePath)}`);
      } else {
        console.log(`⚠️  No router found: ${path.relative(servicesDir, filePath)}`);
      }
    } else {
      // Verify export is correct
      const exportMatch = content.match(/module\.exports\s*=\s*([^;]+);/);
      if (exportMatch && !exportMatch[1].includes('router')) {
        // Export exists but might be wrong
        const relativePath = path.relative(servicesDir, filePath);
        console.log(`⚠️  Check export in: ${relativePath}`);
      }
    }
  } catch (error) {
    console.log(`❌ Error checking ${filePath}: ${error.message}`);
  }
});

console.log(`\n✅ Fixed ${fixedCount} route files out of ${checkedCount} checked`);

