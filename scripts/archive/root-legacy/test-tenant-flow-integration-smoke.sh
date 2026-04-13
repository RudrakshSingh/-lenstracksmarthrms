#!/bin/bash
set -e

echo "Tenant flow integration smoke checks (no running services required)"

echo "1) auth-service register schema includes tenantId + mustChangePassword/passwordTemporary"
node - <<'NODE'
const fs = require('fs');
const content = fs.readFileSync('microservices/auth-service/src/routes/auth.routes.js','utf8');
const ok = content.includes('tenantId: Joi.string().required')
  && content.includes('mustChangePassword')
  && content.includes('passwordTemporary');
if (!ok) {
  console.error('❌ Missing tenantId / temp password fields in register schema');
  process.exit(1);
}
console.log('✅ register schema updated');
NODE

echo "2) auth-service login token includes tenantId + employee_id"
node - <<'NODE'
const fs = require('fs');
const content = fs.readFileSync('microservices/auth-service/src/services/auth.service.js','utf8');
const ok = content.includes('tenantId: user.tenantId') && content.includes('employee_id: user.employee_id');
if (!ok) {
  console.error('❌ Token does not include tenantId + employee_id');
  process.exit(1);
}
console.log('✅ token includes tenantId + employee_id');
NODE

echo "3) tenant-registry auth middleware fallback secret matches auth-service dev default"
node - <<'NODE'
const fs = require('fs');
const content = fs.readFileSync('microservices/tenant-registry-service/src/middleware/auth.middleware.js','utf8');
if (!content.includes("'etelios-dev-secret-key-2024'")) {
  console.error('❌ tenant-registry fallback secret mismatch');
  process.exit(1);
}
console.log('✅ fallback secret aligned');
NODE

echo "4) tenant-registry Tenant model supports superAdminUser persistence"
node - <<'NODE'
const fs = require('fs');
const content = fs.readFileSync('microservices/tenant-registry-service/src/models/Tenant.model.js','utf8');
if (!content.includes('superAdminUser')) {
  console.error('❌ Tenant model missing superAdminUser');
  process.exit(1);
}
console.log('✅ Tenant model has superAdminUser');
NODE

echo "✅ All integration smoke checks passed"
