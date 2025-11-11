# 🔐 Key Vault Secret Name Mapping
## **Complete Mapping: Environment Variables → Key Vault Secrets**

This document maps every environment variable to its corresponding Azure Key Vault secret name.

---

## 📋 Quick Reference

All Key Vault secrets follow this naming convention:
- **Prefix**: `kv-`
- **Format**: Lowercase with hyphens (e.g., `MONGO_URI` → `kv-mongo-uri`)
- **Example**: `kv-jwt-secret`, `kv-redis-url`

---

## 🗂️ Database Secrets

| Environment Variable | Key Vault Secret Name | Required By | Description |
|---------------------|----------------------|-------------|-------------|
| `MONGO_URI` | `kv-mongo-uri` | All Services | MongoDB connection string |
| `MONGODB_URI` | `kv-mongodb-uri` | All Services | Alternative MongoDB URI |
| `REDIS_URL` | `kv-redis-url` | Realtime, Cache | Redis connection string |
| `REDIS_HOST` | `kv-redis-host` | Realtime, Cache | Redis hostname |
| `REDIS_PORT` | `kv-redis-port` | Realtime, Cache | Redis port |
| `REDIS_PASSWORD` | `kv-redis-password` | Realtime, Cache | Redis password |

---

## 🔐 Authentication Secrets

| Environment Variable | Key Vault Secret Name | Required By | Description |
|---------------------|----------------------|-------------|-------------|
| `JWT_SECRET` | `kv-jwt-secret` | Auth Service | JWT signing secret (64 chars) |
| `JWT_REFRESH_SECRET` | `kv-jwt-refresh-secret` | Auth Service | JWT refresh token secret |
| `JWT_EXPIRES_IN` | `kv-jwt-expires-in` | Auth Service | JWT expiration time |
| `JWT_REFRESH_EXPIRES_IN` | `kv-jwt-refresh-expires-in` | Auth Service | Refresh token expiration |
| `BCRYPT_ROUNDS` | `kv-bcrypt-rounds` | Auth Service | Bcrypt hashing rounds |

---

## 📧 Email Configuration

| Environment Variable | Key Vault Secret Name | Required By | Description |
|---------------------|----------------------|-------------|-------------|
| `EMAIL_HOST` | `kv-email-host` | Notification, CRM | SMTP host |
| `EMAIL_PORT` | `kv-email-port` | Notification, CRM | SMTP port |
| `EMAIL_USER` | `kv-email-user` | Notification, CRM | SMTP username |
| `EMAIL_PASS` | `kv-email-pass` | Notification, CRM | SMTP password |
| `EMAIL_FROM` | `kv-email-from` | Notification, CRM | From email address |
| `SENDGRID_API_KEY` | `kv-sendgrid-api-key` | Notification, CRM | SendGrid API key |
| `SENDGRID_FROM_EMAIL` | `kv-sendgrid-from-email` | Notification, CRM | SendGrid from email |

---

## 📱 SMS Configuration (Twilio)

| Environment Variable | Key Vault Secret Name | Required By | Description |
|---------------------|----------------------|-------------|-------------|
| `TWILIO_ACCOUNT_SID` | `kv-twilio-account-sid` | Notification, CRM | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | `kv-twilio-auth-token` | Notification, CRM | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | `kv-twilio-phone-number` | Notification, CRM | Twilio phone number |
| `SMS_ENABLED` | `kv-sms-enabled` | Notification, CRM | Enable/disable SMS |
| `AZURE_COMMUNICATION_CONNECTION_STRING` | `kv-azure-communication-connection-string` | Notification | Azure Communication Services |

---

## 💬 WhatsApp Configuration

| Environment Variable | Key Vault Secret Name | Required By | Description |
|---------------------|----------------------|-------------|-------------|
| `WHATSAPP_API_URL` | `kv-whatsapp-api-url` | Notification, CRM | WhatsApp Business API URL |
| `WHATSAPP_ACCESS_TOKEN` | `kv-whatsapp-access-token` | Notification, CRM | WhatsApp access token |
| `WHATSAPP_PHONE_NUMBER_ID` | `kv-whatsapp-phone-number-id` | Notification, CRM | WhatsApp phone number ID |

---

## 💾 File Storage Configuration

| Environment Variable | Key Vault Secret Name | Required By | Description |
|---------------------|----------------------|-------------|-------------|
| `CLOUDINARY_CLOUD_NAME` | `kv-cloudinary-cloud-name` | Inventory, Document | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | `kv-cloudinary-api-key` | Inventory, Document | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | `kv-cloudinary-api-secret` | Inventory, Document | Cloudinary API secret |
| `AZURE_STORAGE_CONNECTION_STRING` | `kv-azure-storage-connection-string` | Document, Inventory | Azure Storage connection string |
| `AZURE_STORAGE_ACCOUNT_NAME` | `kv-azure-storage-account-name` | Document, Inventory | Azure Storage account name |
| `AZURE_STORAGE_ACCOUNT_KEY` | `kv-azure-storage-account-key` | Document, Inventory | Azure Storage account key |
| `AZURE_STORAGE_CONTAINER_NAME` | `kv-azure-storage-container-name` | Document, Inventory | Azure Storage container name |

---

## 🔒 Security & Encryption

| Environment Variable | Key Vault Secret Name | Required By | Description |
|---------------------|----------------------|-------------|-------------|
| `ENCRYPTION_MASTER_KEY` | `kv-encryption-master-key` | Auth Service | Master encryption key (32 chars) |
| `ENCRYPTION_KEY` | `kv-encryption-key` | All Services | Encryption key for data at rest |

---

## 💳 Payment Gateway Configuration

| Environment Variable | Key Vault Secret Name | Required By | Description |
|---------------------|----------------------|-------------|-------------|
| `RAZORPAY_KEY_ID` | `kv-razorpay-key-id` | Sales, CRM, CPP | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | `kv-razorpay-key-secret` | Sales, CRM, CPP | Razorpay key secret |
| `RAZORPAY_WEBHOOK_SECRET` | `kv-razorpay-webhook-secret` | Sales, CRM, CPP | Razorpay webhook secret |
| `STRIPE_SECRET_KEY` | `kv-stripe-secret-key` | Sales, CRM, CPP | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | `kv-stripe-publishable-key` | Sales, CRM, CPP | Stripe publishable key |

---

## ✍️ E-Signature Configuration

| Environment Variable | Key Vault Secret Name | Required By | Description |
|---------------------|----------------------|-------------|-------------|
| `DOCUSIGN_API_KEY` | `kv-docusign-api-key` | Document Service | DocuSign API key |
| `DOCUSIGN_API_SECRET` | `kv-docusign-api-secret` | Document Service | DocuSign API secret |
| `DOCUSIGN_ACCOUNT_ID` | `kv-docusign-account-id` | Document Service | DocuSign account ID |
| `DIGIO_API_KEY` | `kv-digio-api-key` | Document Service | Digio API key |
| `DIGIO_API_SECRET` | `kv-digio-api-secret` | Document Service | Digio API secret |
| `AADHAAR_API_KEY` | `kv-aadhaar-api-key` | Document Service | Aadhaar API key |
| `AADHAAR_API_SECRET` | `kv-aadhaar-api-secret` | Document Service | Aadhaar API secret |

---

## 🇮🇳 DigiLocker Configuration

| Environment Variable | Key Vault Secret Name | Required By | Description |
|---------------------|----------------------|-------------|-------------|
| `DIGILOCKER_API_URL` | `kv-digilocker-api-url` | Document Service | DigiLocker API URL |
| `DIGILOCKER_API_KEY` | `kv-digilocker-api-key` | Document Service | DigiLocker API key |
| `DIGILOCKER_CLIENT_ID` | `kv-digilocker-client-id` | Document Service | DigiLocker client ID |
| `DIGILOCKER_CLIENT_SECRET` | `kv-digilocker-client-secret` | Document Service | DigiLocker client secret |

---

## 📊 Tax & Government APIs

| Environment Variable | Key Vault Secret Name | Required By | Description |
|---------------------|----------------------|-------------|-------------|
| `GST_API_URL` | `kv-gst-api-url` | Financial Service | GST API URL |
| `GST_API_KEY` | `kv-gst-api-key` | Financial Service | GST API key |
| `EINVOICE_API_URL` | `kv-einvoice-api-url` | Financial Service | E-Invoice API URL |
| `EINVOICE_API_KEY` | `kv-einvoice-api-key` | Financial Service | E-Invoice API key |
| `TAX_API_URL` | `kv-tax-api-url` | Payroll Service | Tax API URL |
| `TAX_API_KEY` | `kv-tax-api-key` | Payroll Service | Tax API key |

---

## 🤖 AI Services Configuration

| Environment Variable | Key Vault Secret Name | Required By | Description |
|---------------------|----------------------|-------------|-------------|
| `OPENAI_API_KEY` | `kv-openai-api-key` | Analytics, AI Services | OpenAI API key |
| `OPENAI_ENDPOINT` | `kv-openai-endpoint` | Analytics, AI Services | OpenAI endpoint |
| `OPENAI_API_VERSION` | `kv-openai-api-version` | Analytics, AI Services | OpenAI API version |
| `OPENAI_CHAT_DEPLOYMENT` | `kv-openai-chat-deployment` | Analytics, AI Services | OpenAI chat deployment |
| `OPENAI_EMBEDDING_DEPLOYMENT` | `kv-openai-embedding-deployment` | Analytics, AI Services | OpenAI embedding deployment |
| `AI_SEARCH_ENDPOINT` | `kv-ai-search-endpoint` | Analytics, AI Services | Azure AI Search endpoint |
| `AI_SEARCH_KEY` | `kv-ai-search-key` | Analytics, AI Services | Azure AI Search key |

---

## 📈 Monitoring & Observability

| Environment Variable | Key Vault Secret Name | Required By | Description |
|---------------------|----------------------|-------------|-------------|
| `APPINSIGHTS_INSTRUMENTATIONKEY` | `kv-appinsights-instrumentation-key` | Monitoring, All Services | Application Insights key |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | `kv-appinsights-connection-string` | Monitoring, All Services | Application Insights connection |

---

## 📲 Push Notifications

| Environment Variable | Key Vault Secret Name | Required By | Description |
|---------------------|----------------------|-------------|-------------|
| `FCM_SERVER_KEY` | `kv-fcm-server-key` | Notification Service | Firebase Cloud Messaging key |
| `FCM_PROJECT_ID` | `kv-fcm-project-id` | Notification Service | Firebase project ID |

---

## 💊 Drug Database

| Environment Variable | Key Vault Secret Name | Required By | Description |
|---------------------|----------------------|-------------|-------------|
| `DRUG_DB_API_URL` | `kv-drug-db-api-url` | Prescription Service | Drug database API URL |
| `DRUG_DB_API_KEY` | `kv-drug-db-api-key` | Prescription Service | Drug database API key |

---

## 🔗 Service URLs

| Environment Variable | Key Vault Secret Name | Required By | Description |
|---------------------|----------------------|-------------|-------------|
| `AUTH_SERVICE_URL` | `kv-auth-service-url` | All Services | Auth service URL |
| `NOTIFICATION_SERVICE_URL` | `kv-notification-service-url` | All Services | Notification service URL |

---

## 🏢 Multi-Tenant Configuration

| Environment Variable | Key Vault Secret Name | Required By | Description |
|---------------------|----------------------|-------------|-------------|
| `TENANT_DB_PREFIX` | `kv-tenant-db-prefix` | Tenant Registry | Database prefix for tenants |
| `TENANT_AUTO_PROVISION` | `kv-tenant-auto-provision` | Tenant Registry | Auto-provision tenants |

---

## 📝 How to Use This Mapping

### **1. Store Secret in Key Vault**

```bash
# Example: Store MONGO_URI
az keyvault secret set \
  --vault-name etelios-kv-prod \
  --name kv-mongo-uri \
  --value "mongodb://user:pass@host:27017/db"
```

### **2. Retrieve Secret in Code**

```javascript
// The mapping is automatic - just use the env var name
const config = require('./utils/config');
const mongoUri = await config.get('MONGO_URI');
// Will automatically fetch from kv-mongo-uri in Key Vault
```

### **3. Verify Secret Exists**

```bash
az keyvault secret show \
  --vault-name etelios-kv-prod \
  --name kv-mongo-uri
```

---

## 🔄 Migration Checklist

- [ ] Create Key Vault: `etelios-kv-prod`
- [ ] Set access policies
- [ ] Store database secrets (`kv-mongo-uri`, `kv-redis-url`)
- [ ] Store authentication secrets (`kv-jwt-secret`, `kv-jwt-refresh-secret`)
- [ ] Store email secrets (`kv-sendgrid-api-key`)
- [ ] Store SMS secrets (`kv-twilio-account-sid`, `kv-twilio-auth-token`)
- [ ] Store storage secrets (`kv-azure-storage-connection-string`)
- [ ] Store payment secrets (`kv-razorpay-key-id`, `kv-razorpay-key-secret`)
- [ ] Store security secrets (`kv-encryption-master-key`)
- [ ] Update service configuration (`AZURE_KEY_VAULT_URL`, `USE_KEY_VAULT=true`)
- [ ] Test each service
- [ ] Monitor for errors

---

## 📊 Secret Count Summary

- **Database**: 6 secrets
- **Authentication**: 5 secrets
- **Email**: 7 secrets
- **SMS**: 5 secrets
- **WhatsApp**: 3 secrets
- **File Storage**: 7 secrets
- **Security**: 2 secrets
- **Payment**: 5 secrets
- **E-Signature**: 7 secrets
- **DigiLocker**: 4 secrets
- **Tax APIs**: 6 secrets
- **AI Services**: 7 secrets
- **Monitoring**: 2 secrets
- **Push**: 2 secrets
- **Drug DB**: 2 secrets
- **Service URLs**: 2 secrets
- **Multi-tenant**: 2 secrets

**Total**: ~70 secrets (varies by service)

---

**Last Updated**: January 2024

