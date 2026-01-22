# Quick Local Testing Guide

## ⚠️ Important Prerequisites

Before testing locally, ensure:
1. **Database is accessible** - MongoDB/Cosmos DB connection configured
2. **Environment variables set** - `.env` files in both services
3. **Dependencies installed** - Run `npm install` in both services

## 🚀 Quick Start (3 Options)

### Option 1: Manual Start (Recommended for first time)

**Terminal 1:**
```bash
cd microservices/auth-service
npm start
```

**Terminal 2:**
```bash
cd microservices/hr-service
npm start
```

**Terminal 3:**
```bash
BASE_URL=http://localhost:3002 \
AUTH_URL=http://localhost:3001 \
node test-multi-tenant-implementation.js
```

### Option 2: Background Start Script

```bash
./start-services-for-testing.sh
```

Then run test:
```bash
BASE_URL=http://localhost:3002 \
AUTH_URL=http://localhost:3001 \
node test-multi-tenant-implementation.js
```

### Option 3: Test Against Production (After Deployment)

```bash
BASE_URL=https://98.70.245.87 \
AUTH_URL=https://98.70.245.87 \
node test-multi-tenant-implementation.js
```

## 🔍 Troubleshooting

### Services won't start
- Check if ports 3001 and 3002 are already in use
- Verify `.env` files exist and have correct values
- Check database connection

### Database connection errors
- Verify `MONGODB_URI` in `.env` files
- Check if database is accessible from your network
- For Cosmos DB, ensure `retryWrites=false` in connection string

### Test fails with "Token missing tenantId"
- Verify code changes are saved
- Check if services restarted after code changes
- Verify user in database has `tenantId` field

## ✅ Expected Test Results

When all tests pass:
```
━━━ Test Summary ━━━
ℹ Total Tests: 5
✓ Passed: 5
✓ All tests passed! 🎉
```

## 📝 Next Steps After Local Testing

1. ✅ Verify all tests pass locally
2. ✅ Push changes to Azure DevOps
3. ✅ Deploy via pipeline
4. ✅ Test in production
