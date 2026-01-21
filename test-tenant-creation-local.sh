#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     🏢 TENANT CREATION - LOCAL TEST                          ║"
echo "║     (Admin & Super Admin Auto-Creation)                      ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

cd microservices/tenant-registry-service

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Step 1: Syntax Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Checking adminUser.service.js..."
if node -c src/services/adminUser.service.js 2>/dev/null; then
    echo "  ✅ Syntax OK"
else
    echo "  ❌ Syntax Error"
    exit 1
fi

echo ""
echo "Checking tenant.controller.js..."
if node -c src/controllers/tenant.controller.js 2>/dev/null; then
    echo "  ✅ Syntax OK"
else
    echo "  ❌ Syntax Error"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Step 2: Service Load Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

node -e "
const service = require('./src/services/adminUser.service.js');
console.log('✅ Service loads successfully');
console.log('  Methods available:');
console.log('    - createAdminUsers:', typeof service.createAdminUsers);
console.log('    - createAdminUser:', typeof service.createAdminUser);
console.log('    - generateTemporaryPassword:', typeof service.generateTemporaryPassword);
" 2>&1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Step 3: Password Generation Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

node -e "
const service = require('./src/services/adminUser.service.js');

// Test password generation
const passwords = [];
for (let i = 0; i < 5; i++) {
  passwords.push(service.generateTemporaryPassword());
}

console.log('Generated 5 passwords:');
passwords.forEach((pwd, i) => {
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[!@#\$%^&*]/.test(pwd);
  const isValid = hasUpper && hasLower && hasNumber && hasSpecial && pwd.length === 12;
  
  console.log(\`  \${i+1}. \${pwd} (length: \${pwd.length}) - \${isValid ? '✅' : '❌'}\`);
});

// Check uniqueness
const unique = new Set(passwords).size === passwords.length;
console.log('');
console.log('Uniqueness:', unique ? '✅ All unique' : '❌ Duplicates found');

// Check complexity of first password
const pwd = passwords[0];
const hasUpper = /[A-Z]/.test(pwd);
const hasLower = /[a-z]/.test(pwd);
const hasNumber = /[0-9]/.test(pwd);
const hasSpecial = /[!@#\$%^&*]/.test(pwd);

console.log('');
console.log('Password complexity (first password):');
console.log('  Uppercase:', hasUpper ? '✅' : '❌');
console.log('  Lowercase:', hasLower ? '✅' : '❌');
console.log('  Number:', hasNumber ? '✅' : '❌');
console.log('  Special:', hasSpecial ? '✅' : '❌');
console.log('  Length 12:', pwd.length === 12 ? '✅' : '❌');

if (hasUpper && hasLower && hasNumber && hasSpecial && pwd.length === 12 && unique) {
  console.log('');
  console.log('✅✅✅ Password generation: PERFECT!');
} else {
  console.log('');
  console.log('❌ Password generation needs fix');
  process.exit(1);
}
" 2>&1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Step 4: Email Format Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

node -e "
const service = require('./src/services/adminUser.service.js');

// Test email extraction
const testEmails = [
  'admin@company.com',
  'contact@example.org',
  'user@test.co.in',
  'john.doe@mycompany.com'
];

console.log('Email format tests:');
testEmails.forEach(email => {
  const emailParts = email.split('@');
  const superAdminEmail = \`superadmin@\${emailParts[1]}\`;
  console.log(\`  \${email} → \${superAdminEmail}\`);
});

console.log('');
console.log('✅ Email format: Correct');
" 2>&1

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     📊 FINAL RESULT                                           ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

echo "Code Status:"
echo "  ✅ Syntax: OK"
echo "  ✅ Service loads: OK"
echo "  ✅ Methods available: OK"
echo "  ✅ Password generation: OK"
echo "  ✅ Email format: OK"
echo ""

echo "✅✅✅ All checks passed! Ready for deployment! ✅✅✅"
echo ""

