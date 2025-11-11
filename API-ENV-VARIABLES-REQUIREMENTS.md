# 🔐 API Environment Variables Requirements
## **Which APIs Need Which Environment Variables**

This document maps every API endpoint to the environment variables it requires to function properly.

---

## 📋 Table of Contents

1. [Common Environment Variables](#common-environment-variables)
2. [Service-Specific Requirements](#service-specific-requirements)
3. [API Endpoint Mapping](#api-endpoint-mapping)
4. [Quick Setup Guide](#quick-setup-guide)

---

## 🔑 Common Environment Variables (Required by All Services)

### **Essential (Required for Basic Functionality)**

```env
# Database (REQUIRED for all services)
MONGO_URI=mongodb://localhost:27017/etelios
# OR
MONGODB_URI=mongodb://localhost:27017/etelios

# Service Configuration
NODE_ENV=development
PORT=3001  # (varies by service)
SERVICE_NAME=auth-service  # (varies by service)

# CORS
CORS_ORIGIN=http://localhost:3000
```

### **Optional (Service-Specific)**

```env
# Redis (Required for caching, sessions, real-time)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Logging
LOG_LEVEL=info
LOG_FILE=logs/etelios.log
```

---

## 🎯 Service-Specific Environment Variables

### **1. Auth Service (Port 3001) - 49 APIs**

#### **Required for Authentication APIs:**
```env
# JWT (REQUIRED for all auth APIs)
JWT_SECRET=your-64-character-jwt-secret-key
JWT_REFRESH_SECRET=your-64-character-refresh-secret
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Database
MONGO_URI=mongodb://localhost:27017/etelios_auth
```

#### **Required for Password Reset APIs:**
```env
# Email (Required for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@etelios.com
# OR
SENDGRID_API_KEY=SG.your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@etelios.com
```

#### **Required for Emergency Lock APIs:**
```env
# Emergency Lock System
EMERGENCY_LOCK_ENABLED=true
GREYWALL_ENABLED=true
ENCRYPTION_MASTER_KEY=your-32-character-key
```

**APIs Requiring These Env Vars:**
- ✅ `/api/auth/login` - Needs JWT_SECRET
- ✅ `/api/auth/register` - Needs JWT_SECRET
- ✅ `/api/auth/refresh-token` - Needs JWT_REFRESH_SECRET
- ✅ `/api/auth/request-password-reset` - Needs EMAIL config
- ✅ `/api/auth/reset-password` - Needs EMAIL config
- ✅ `/api/auth/emergency/*` - Needs ENCRYPTION_MASTER_KEY

---

### **2. HR Service (Port 3002) - 27 APIs**

#### **Required:**
```env
# Database
MONGO_URI=mongodb://localhost:27017/etelios_hr

# Redis (for caching)
REDIS_URL=redis://localhost:6379
```

**APIs Requiring These Env Vars:**
- ✅ All `/api/hr/*` endpoints need MONGO_URI
- ✅ Caching-enabled endpoints need REDIS_URL

---

### **3. Attendance Service (Port 3003) - 10 APIs**

#### **Required:**
```env
# Database
MONGO_URI=mongodb://localhost:27017/etelios_attendance

# Geofencing (for location-based check-in)
GEOFENCING_ENABLED=true
GEOFENCING_RADIUS=100  # meters
```

**APIs Requiring These Env Vars:**
- ✅ `/api/attendance/clock-in` - Needs geofencing config
- ✅ `/api/attendance/clock-out` - Needs geofencing config
- ✅ `/api/attendance/geofencing` - Needs GEOFENCING_ENABLED

---

### **4. Payroll Service (Port 3004) - 17 APIs**

#### **Required:**
```env
# Database
MONGO_URI=mongodb://localhost:27017/etelios_payroll

# Tax Configuration (for payroll calculations)
TAX_API_ENABLED=true
TAX_API_URL=https://api.tax.gov.in
```

**APIs Requiring These Env Vars:**
- ✅ `/api/payroll/process` - Needs tax configuration
- ✅ `/api/payroll/salaries` - Needs MONGO_URI

---

### **5. CRM Service (Port 3005) - 69 APIs**

#### **Required for Customer Management:**
```env
# Database
MONGO_URI=mongodb://localhost:27017/etelios_crm

# Redis (for caching customer data)
REDIS_URL=redis://localhost:6379
```

#### **Required for Engagement APIs:**
```env
# Email (Required for email campaigns)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
# OR
SENDGRID_API_KEY=SG.your-key
SENDGRID_FROM_EMAIL=noreply@etelios.com

# SMS (Required for SMS campaigns)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890
SMS_ENABLED=true

# WhatsApp (Required for WhatsApp campaigns)
WHATSAPP_API_URL=https://graph.facebook.com/v17.0
WHATSAPP_ACCESS_TOKEN=your-whatsapp-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-id
```

#### **Required for Loyalty/Wallet APIs:**
```env
# Payment Gateway (for wallet transactions)
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
# OR
STRIPE_SECRET_KEY=sk_test_your-stripe-key
```

**APIs Requiring These Env Vars:**
- ✅ `/api/crm/engagement/send` - Needs EMAIL or SMS config
- ✅ `/api/crm/engagement/campaigns` - Needs EMAIL config
- ✅ `/api/crm/wallet/credit` - Needs payment gateway config
- ✅ `/api/crm/wallet/debit` - Needs payment gateway config
- ✅ `/api/crm/loyalty/*` - Needs MONGO_URI + REDIS_URL

---

### **6. Inventory Service (Port 3006) - 44 APIs**

#### **Required for Product Management:**
```env
# Database
MONGO_URI=mongodb://localhost:27017/etelios_inventory

# File Storage (for product images)
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
# OR
AZURE_STORAGE_ACCOUNT_NAME=your-storage-account
AZURE_STORAGE_ACCOUNT_KEY=your-storage-key
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
```

#### **Required for Stock Management:**
```env
# Redis (for real-time stock updates)
REDIS_URL=redis://localhost:6379
```

**APIs Requiring These Env Vars:**
- ✅ `/api/inventory/products/*/image` - Needs CLOUDINARY or AZURE_STORAGE
- ✅ `/api/inventory/products` (POST/PUT) - Needs file storage for images
- ✅ `/api/inventory/stock` - Needs REDIS_URL for real-time updates

---

### **7. Sales Service (Port 3007) - 79 APIs**

#### **Required for Orders:**
```env
# Database
MONGO_URI=mongodb://localhost:27017/etelios_sales

# Payment Gateway (for order payments)
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
# OR
STRIPE_SECRET_KEY=sk_test_your-key
```

#### **Required for POS:**
```env
# Offline Sync (for POS offline mode)
OFFLINE_SYNC_ENABLED=true
SYNC_QUEUE_URL=redis://localhost:6379
```

**APIs Requiring These Env Vars:**
- ✅ `/api/sales/orders` (POST) - Needs payment gateway config
- ✅ `/api/sales/pos/online/*` - Needs payment gateway
- ✅ `/api/sales/pos/offline/*` - Needs OFFLINE_SYNC_ENABLED

---

### **8. Purchase Service (Port 3008) - 22 APIs**

#### **Required:**
```env
# Database
MONGO_URI=mongodb://localhost:27017/etelios_purchase
```

**APIs Requiring These Env Vars:**
- ✅ All `/api/purchase/*` endpoints need MONGO_URI

---

### **9. Financial Service (Port 3009) - 18 APIs**

#### **Required for Accounting:**
```env
# Database
MONGO_URI=mongodb://localhost:27017/etelios_financial

# Tax API (for GST/TDS calculations)
GST_API_URL=https://api.gst.gov.in
GST_API_KEY=your-gst-api-key
EINVOICE_API_URL=https://api.einvoice.gov.in
EINVOICE_API_KEY=your-einvoice-key
```

**APIs Requiring These Env Vars:**
- ✅ `/api/financial/pandl` - Needs MONGO_URI
- ✅ `/api/financial/tds` - Needs tax API config
- ✅ `/api/financial/reports/*` - Needs MONGO_URI

---

### **10. Document Service (Port 3010) - 32 APIs**

#### **Required for Document Storage:**
```env
# Database
MONGO_URI=mongodb://localhost:27017/etelios_documents

# File Storage (REQUIRED for uploads)
AZURE_STORAGE_ACCOUNT_NAME=your-storage-account
AZURE_STORAGE_ACCOUNT_KEY=your-storage-key
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
# OR
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
```

#### **Required for E-Signature APIs:**
```env
# E-Signature Providers
DOCUSIGN_API_KEY=your-docusign-key
DOCUSIGN_API_SECRET=your-docusign-secret
DOCUSIGN_ACCOUNT_ID=your-account-id
# OR
DIGIO_API_KEY=your-digio-key
DIGIO_API_SECRET=your-digio-secret
# OR
AADHAAR_API_KEY=your-aadhaar-key
AADHAAR_API_SECRET=your-aadhaar-secret
```

#### **Required for DigiLocker Integration:**
```env
# DigiLocker (for government document verification)
DIGILOCKER_API_URL=https://api.digilocker.gov.in
DIGILOCKER_API_KEY=your-digilocker-key
DIGILOCKER_CLIENT_ID=your-client-id
DIGILOCKER_CLIENT_SECRET=your-client-secret
```

**APIs Requiring These Env Vars:**
- ✅ `/api/documents/upload` - Needs file storage config
- ✅ `/api/documents/*/download` - Needs file storage config
- ✅ `/api/documents/esign/*` - Needs e-signature provider config
- ✅ `/api/documents/contracts-vault/digilocker/*` - Needs DIGILOCKER config

---

### **11. Service Management (Port 3011) - 50 APIs**

#### **Required:**
```env
# Database
MONGO_URI=mongodb://localhost:27017/etelios_service

# Email (for ticket notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

**APIs Requiring These Env Vars:**
- ✅ `/api/service/tickets` (POST) - Needs EMAIL for notifications
- ✅ `/api/service/sla/*` - Needs EMAIL for SLA alerts

---

### **12. CPP Service (Port 3012) - 17 APIs**

#### **Required:**
```env
# Database
MONGO_URI=mongodb://localhost:27017/etelios_cpp

# Payment Gateway (for CPP enrollments)
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
```

**APIs Requiring These Env Vars:**
- ✅ `/api/cpp/enroll` - Needs payment gateway config
- ✅ `/api/cpp/claims/:id/checkout` - Needs payment gateway config

---

### **13. Prescription Service (Port 3013) - 29 APIs**

#### **Required:**
```env
# Database
MONGO_URI=mongodb://localhost:27017/etelios_prescription

# Drug Database API (for drug interaction checks)
DRUG_DB_API_URL=https://api.drugdatabase.com
DRUG_DB_API_KEY=your-drug-db-key
```

**APIs Requiring These Env Vars:**
- ✅ `/api/prescription/prescriptions` (POST) - Needs drug database for validation

---

### **14. Analytics Service (Port 3014) - 21 APIs**

#### **Required:**
```env
# Database
MONGO_URI=mongodb://localhost:27017/etelios_analytics

# Redis (for caching analytics results)
REDIS_URL=redis://localhost:6379

# External BI Tools (optional)
SUPERSET_URL=http://localhost:8088
SUPERSET_USERNAME=admin
SUPERSET_PASSWORD=admin
```

**APIs Requiring These Env Vars:**
- ✅ All `/api/analytics/*` endpoints need MONGO_URI
- ✅ Cached analytics endpoints need REDIS_URL

---

### **15. Notification Service (Port 3015) - 9 APIs**

#### **Required:**
```env
# Database
MONGO_URI=mongodb://localhost:27017/etelios_notifications

# Email (REQUIRED)
SENDGRID_API_KEY=SG.your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@etelios.com
# OR
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# SMS (REQUIRED for SMS notifications)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890
# OR
AZURE_COMMUNICATION_CONNECTION_STRING=endpoint=https://...

# WhatsApp (REQUIRED for WhatsApp notifications)
WHATSAPP_API_URL=https://graph.facebook.com/v17.0
WHATSAPP_ACCESS_TOKEN=your-whatsapp-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-id

# Push Notifications (optional)
FCM_SERVER_KEY=your-fcm-key
```

**APIs Requiring These Env Vars:**
- ✅ `/api/notification` (POST) - Needs EMAIL or SMS config
- ✅ All notification endpoints need at least one communication channel

---

### **16. Monitoring Service (Port 3016) - 1 API**

#### **Required:**
```env
# Database
MONGO_URI=mongodb://localhost:27017/etelios_monitoring

# Application Insights (for Azure)
APPINSIGHTS_INSTRUMENTATIONKEY=your-key
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...
```

**APIs Requiring These Env Vars:**
- ✅ `/api/monitoring/metrics` - Needs monitoring config

---

### **17. Tenant Registry Service (Port 3020) - 8 APIs**

#### **Required:**
```env
# Database
MONGO_URI=mongodb://localhost:27017/etelios_tenant_registry

# Multi-tenant Configuration
TENANT_DB_PREFIX=etelios_tenant_
TENANT_AUTO_PROVISION=true
```

**APIs Requiring These Env Vars:**
- ✅ `/api/tenants` (POST) - Needs tenant provisioning config

---

### **18. Realtime Service (Port 3021) - 1 API**

#### **Required:**
```env
# Redis (REQUIRED for WebSocket pub/sub)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# WebSocket Configuration
WS_PORT=3021
WS_HEARTBEAT_INTERVAL=30000
```

**APIs Requiring These Env Vars:**
- ✅ WebSocket connections need REDIS_URL

---

### **19. API Gateway (Port 3000) - 2 APIs**

#### **Required:**
```env
# Service URLs (for routing)
AUTH_SERVICE_URL=http://localhost:3001
HR_SERVICE_URL=http://localhost:3002
ATTENDANCE_SERVICE_URL=http://localhost:3003
# ... (all service URLs)
```

**APIs Requiring These Env Vars:**
- ✅ All gateway routes need service URLs

---

## 📊 Quick Reference Matrix

| Service | Essential Env Vars | Optional Env Vars | APIs Affected |
|---------|-------------------|------------------|---------------|
| **Auth** | MONGO_URI, JWT_SECRET | EMAIL (password reset), ENCRYPTION_MASTER_KEY | 49 |
| **HR** | MONGO_URI | REDIS_URL | 27 |
| **Attendance** | MONGO_URI | GEOFENCING config | 10 |
| **Payroll** | MONGO_URI | TAX_API | 17 |
| **CRM** | MONGO_URI | EMAIL, SMS, WhatsApp, Payment Gateway | 69 |
| **Inventory** | MONGO_URI | CLOUDINARY/AZURE_STORAGE (images) | 44 |
| **Sales** | MONGO_URI | Payment Gateway, OFFLINE_SYNC | 79 |
| **Purchase** | MONGO_URI | - | 22 |
| **Financial** | MONGO_URI | GST_API, EINVOICE_API | 18 |
| **Document** | MONGO_URI | File Storage, E-Signature, DigiLocker | 32 |
| **Service Management** | MONGO_URI | EMAIL (notifications) | 50 |
| **CPP** | MONGO_URI | Payment Gateway | 17 |
| **Prescription** | MONGO_URI | DRUG_DB_API | 29 |
| **Analytics** | MONGO_URI | REDIS_URL, SUPERSET | 21 |
| **Notification** | MONGO_URI | EMAIL, SMS, WhatsApp, FCM | 9 |
| **Monitoring** | MONGO_URI | APPINSIGHTS | 1 |
| **Tenant Registry** | MONGO_URI | TENANT config | 8 |
| **Realtime** | REDIS_URL | WS config | 1 |

---

## 🚨 Critical Environment Variables

### **Must Have for ALL APIs to Work:**
1. ✅ **MONGO_URI** - Required by 19/19 services (505 APIs)
2. ✅ **JWT_SECRET** - Required by auth-service (affects all protected APIs)

### **Must Have for Specific Features:**
3. ✅ **EMAIL config** - Required for:
   - Password reset (Auth Service)
   - Email campaigns (CRM Service)
   - Ticket notifications (Service Management)
   - All notifications (Notification Service)

4. ✅ **REDIS_URL** - Required for:
   - Session management (Auth Service)
   - Real-time features (Realtime Service)
   - Caching (Analytics, CRM, Inventory)
   - Queue processing (Sales offline mode)

5. ✅ **File Storage** - Required for:
   - Product images (Inventory Service)
   - Document uploads (Document Service)

6. ✅ **Payment Gateway** - Required for:
   - Wallet operations (CRM Service)
   - Order payments (Sales Service)
   - CPP enrollments (CPP Service)

---

## 🔧 Environment Variable Priority

### **Level 1: Critical (Must Have)**
- `MONGO_URI` - Without this, NO APIs work
- `JWT_SECRET` - Without this, NO protected APIs work

### **Level 2: Important (Feature-Specific)**
- `REDIS_URL` - For caching and real-time features
- `EMAIL_*` or `SENDGRID_API_KEY` - For email functionality
- File Storage config - For file uploads

### **Level 3: Optional (Enhancement)**
- `TWILIO_*` - For SMS
- `WHATSAPP_*` - For WhatsApp
- `PAYMENT_GATEWAY_*` - For payments
- `CLOUDINARY_*` - For image processing

---

## 📝 Quick Setup Checklist

### **Minimum Setup (Basic Functionality)**
```env
# 1. Database (REQUIRED)
MONGO_URI=mongodb://localhost:27017/etelios

# 2. JWT (REQUIRED for auth)
JWT_SECRET=your-secret-key-64-chars
JWT_REFRESH_SECRET=your-refresh-secret-64-chars

# 3. Service Ports (defaults available)
PORT=3001  # varies by service
```

**With this setup**: ~450 APIs will work (without email, file uploads, payments)

### **Full Setup (All Features)**
```env
# 1. Database
MONGO_URI=mongodb://localhost:27017/etelios

# 2. JWT
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# 3. Redis
REDIS_URL=redis://localhost:6379

# 4. Email
SENDGRID_API_KEY=SG....

# 5. SMS
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...

# 6. File Storage
AZURE_STORAGE_CONNECTION_STRING=...

# 7. Payment Gateway
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...

# 8. E-Signature
DOCUSIGN_API_KEY=...
```

**With this setup**: All 505 APIs will work fully

---

## 🎯 API Endpoint Requirements Summary

### **APIs That Work WITHOUT Any Special Env Vars (Just MONGO_URI):**
- ✅ All GET endpoints (read operations)
- ✅ Basic CRUD operations
- ✅ Health checks
- ✅ Most reporting endpoints

**Count**: ~350 APIs

### **APIs That Need EMAIL Config:**
- ✅ `/api/auth/request-password-reset`
- ✅ `/api/auth/reset-password`
- ✅ `/api/crm/engagement/send`
- ✅ `/api/crm/engagement/campaigns`
- ✅ `/api/service/tickets` (notifications)
- ✅ `/api/notification` (email notifications)

**Count**: ~50 APIs

### **APIs That Need FILE STORAGE Config:**
- ✅ `/api/inventory/products/:id/image` (POST)
- ✅ `/api/documents/upload`
- ✅ `/api/documents/contracts-vault/upload`
- ✅ `/api/documents/:documentId/download`

**Count**: ~20 APIs

### **APIs That Need PAYMENT GATEWAY Config:**
- ✅ `/api/sales/orders` (POST) - if payment required
- ✅ `/api/crm/wallet/credit`
- ✅ `/api/crm/wallet/debit`
- ✅ `/api/cpp/enroll`
- ✅ `/api/cpp/claims/:id/checkout`

**Count**: ~15 APIs

### **APIs That Need SMS Config:**
- ✅ `/api/crm/engagement/send` (SMS mode)
- ✅ `/api/notification` (SMS notifications)

**Count**: ~10 APIs

### **APIs That Need E-SIGNATURE Config:**
- ✅ `/api/documents/esign/:documentId/initiate`
- ✅ `/api/documents/esign/*`

**Count**: ~8 APIs

### **APIs That Need REDIS:**
- ✅ Real-time features
- ✅ Caching endpoints
- ✅ Session management
- ✅ WebSocket connections

**Count**: ~60 APIs (benefit from caching)

---

## 📄 Files to Create/Update

For each service, create a `.env` file in the service directory:

```bash
# Example: microservices/auth-service/.env
MONGO_URI=mongodb://localhost:27017/etelios_auth
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

---

## 🔍 How to Check Which APIs Need Which Env Vars

### **Method 1: Check Service Logs**
```bash
# Start service and check logs
cd microservices/auth-service
npm start
# Check logs for missing env var errors
```

### **Method 2: Test Endpoints**
```bash
# Test endpoint - if it fails with specific error, check env vars
curl http://localhost:3001/api/auth/login
# Error will indicate missing env vars
```

### **Method 3: Check Source Code**
```bash
# Search for process.env usage
grep -r "process.env" microservices/auth-service/src/
```

---

## ✅ Quick Setup Script

Create a script to set up all env files:

```bash
# Copy template to each service
for service in microservices/*/; do
  cp microservices/env.example "$service/.env"
  echo "Created .env for $(basename $service)"
done
```

---

## 🎯 Summary

**Total APIs**: 505
- ✅ **~350 APIs** work with just MONGO_URI (basic setup)
- ⚠️ **~50 APIs** need EMAIL config
- ⚠️ **~20 APIs** need FILE STORAGE config
- ⚠️ **~15 APIs** need PAYMENT GATEWAY config
- ⚠️ **~10 APIs** need SMS config
- ⚠️ **~8 APIs** need E-SIGNATURE config
- ✅ **~60 APIs** benefit from REDIS (caching)

**Minimum Setup**: MONGO_URI + JWT_SECRET = 450+ APIs working  
**Full Setup**: All env vars = 505 APIs working perfectly

---

**Last Updated**: January 2024

