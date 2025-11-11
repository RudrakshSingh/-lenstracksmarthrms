# 📧 Netcore Services Integration Guide
## **Integration Guide for Etelios ERP**

**Date**: January 2025  
**Purpose**: Complete integration guide for integrating Netcore services into Etelios ERP system

---

## 📋 Executive Summary

This guide explains how to integrate **Netcore Cloud** services into the Etelios ERP system. Netcore provides Email, SMS, WhatsApp, and Voice services that can replace current communication service providers.

### **What Services We Need from Netcore:**

1. **Netcore Email API** - For transactional and promotional emails
2. **Netcore SMS API** - For SMS notifications and OTPs
3. **Netcore WhatsApp Business API** - For WhatsApp messaging
4. **Netcore Voice API** - For voice calls (optional)

---

## 🎯 Services Overview

### **1. Netcore Email API**

**Purpose**: Replace SendGrid/Nodemailer for email communications

**What It Does**:
- Sends transactional emails (password resets, order confirmations, invoices)
- Sends promotional emails (marketing campaigns, newsletters)
- Provides email templates with dynamic variables
- Tracks email delivery, opens, clicks, and bounces
- Manages sender domain reputation and SPF/DKIM/DMARC
- Handles unsubscribe management automatically

**Integration Methods Available**:
- SMTP integration (easiest, works with existing Nodemailer setup)
- REST API integration (more control, better tracking)

**Features We Need**:
- Single email sending
- Bulk email sending
- Email templates
- Dynamic variables in templates
- Email tracking (delivery, open, click)
- Bounce and unsubscribe handling
- Domain verification and management

---

### **2. Netcore SMS API**

**Purpose**: Replace Twilio/Azure Communication Services for SMS

**What It Does**:
- Sends SMS messages to any phone number
- Supports DLT registration for India
- Provides SMS templates (required for promotional SMS in India)
- Tracks SMS delivery status
- Handles SMS delivery reports via webhooks
- Supports two-way SMS (receive replies)

**Integration Methods Available**:
- REST API integration (recommended)
- SMPP integration (for high-volume)

**Features We Need**:
- Single SMS sending
- Bulk SMS sending
- SMS templates
- Dynamic variables in templates
- SMS delivery status tracking
- DLT registration support
- Webhook callbacks for delivery reports

---

### **3. Netcore WhatsApp Business API**

**Purpose**: Replace Meta WhatsApp Business API for WhatsApp messaging

**What It Does**:
- Sends WhatsApp messages via official WhatsApp Business API
- Supports text, media, documents, and interactive messages
- Manages WhatsApp templates (required for business messaging)
- Handles WhatsApp webhooks for message status and incoming messages
- Provides WhatsApp message templates with approval
- Supports WhatsApp Business profile management

**Integration Methods Available**:
- REST API integration (only method for WhatsApp)

**Features We Need**:
- Single WhatsApp message sending
- Bulk WhatsApp messaging
- WhatsApp message templates
- Media and document sending
- Interactive message buttons
- WhatsApp delivery status tracking
- Webhook callbacks for message status
- Two-way WhatsApp messaging (receive messages)

---

### **4. Netcore Voice API** (Optional)

**Purpose**: Add voice calling capabilities

**What It Does**:
- Makes outbound voice calls
- Plays pre-recorded messages or text-to-speech
- Handles call status and duration tracking
- Supports interactive voice response (IVR)
- Provides call recording (if needed)

**Integration Methods Available**:
- REST API integration

**Features We Need** (if implementing):
- Outbound voice calls
- Text-to-speech conversion
- Call status tracking
- Call recording (optional)

---

## 🔧 Integration Architecture

### **Current System Architecture**

**Notification Service** handles all communications:
- Email service uses Nodemailer with SMTP
- SMS service uses Twilio SDK
- WhatsApp service (if implemented) uses Meta WhatsApp API

**Services That Need Integration**:
1. **notification-service** - Main service for all notifications
2. **crm-service** - Uses notifications for customer engagement
3. **auth-service** - Uses email/SMS for OTP and password reset

---

## 📦 Integration Steps

### **Step 1: Netcore Account Setup**

**Required Actions**:
1. Create Netcore Cloud account
2. Get API keys for Email, SMS, WhatsApp services
3. Verify domain for email sending
4. Register for DLT (for SMS in India)
5. Register WhatsApp Business number
6. Configure webhook URLs for delivery callbacks

**What You'll Get**:
- Email API Key
- SMS API Key
- WhatsApp API Key
- Webhook verification tokens
- Domain verification details
- DLT registration details

---

### **Step 2: Environment Configuration**

**Environment Variables Needed**:

**Email Service Variables**:
- Netcore Email API Key
- Netcore Email SMTP Host (if using SMTP)
- Netcore Email SMTP Port
- Netcore Email From Address
- Netcore Email From Name

**SMS Service Variables**:
- Netcore SMS API Key
- Netcore SMS Sender ID
- Netcore SMS API Endpoint

**WhatsApp Service Variables**:
- Netcore WhatsApp API Key
- Netcore WhatsApp Business Account ID
- Netcore WhatsApp Phone Number ID
- Netcore WhatsApp Webhook Verify Token

**Voice Service Variables** (if implementing):
- Netcore Voice API Key
- Netcore Voice API Endpoint

---

### **Step 3: Service Integration**

#### **Email Service Integration**

**Current Implementation**: Uses Nodemailer with SMTP

**Integration Approach**:
- Option A: Replace SMTP configuration with Netcore SMTP (minimal code changes)
- Option B: Replace Nodemailer with Netcore REST API (more control, better tracking)

**What Needs to Change**:
- Email service class in notification-service
- SMTP configuration or API client initialization
- Email sending method to use Netcore API
- Add template support if not already present
- Add tracking webhook handler for email events

**Files to Modify**:
- `microservices/notification-service/src/services/emailService.js`
- Add Netcore email client/configuration

---

#### **SMS Service Integration**

**Current Implementation**: Uses Twilio SDK

**Integration Approach**:
- Replace Twilio SDK with Netcore SMS REST API
- Update SMS sending method
- Add template support for DLT compliance
- Add webhook handler for SMS delivery reports

**What Needs to Change**:
- SMS service class in notification-service
- Replace Twilio client with Netcore API client
- Update SMS sending method
- Add template management for DLT
- Add webhook handler for SMS callbacks

**Files to Modify**:
- `microservices/notification-service/src/utils/sms.js`
- Add Netcore SMS client/configuration

---

#### **WhatsApp Service Integration**

**Current Implementation**: May use Meta WhatsApp API or placeholder

**Integration Approach**:
- Replace/Implement WhatsApp service with Netcore WhatsApp API
- Add template management
- Add webhook handler for WhatsApp events
- Implement media/document sending

**What Needs to Change**:
- WhatsApp service class in notification-service
- Add Netcore WhatsApp API client
- Implement WhatsApp message sending
- Add template management
- Add webhook handler for WhatsApp callbacks

**Files to Modify**:
- `microservices/notification-service/src/services/whatsappService.js` (may need to create)
- Add Netcore WhatsApp client/configuration

---

#### **Voice Service Integration** (Optional)

**Current Implementation**: Not currently used

**Integration Approach**:
- Implement new voice service class
- Add Netcore Voice API client
- Implement voice call methods
- Add webhook handler for call status

**What Needs to Change**:
- Create new voice service class
- Add Netcore Voice API client
- Implement voice calling methods

**Files to Create/Modify**:
- `microservices/notification-service/src/services/voiceService.js` (new)

---

### **Step 4: Webhook Implementation**

**What Webhooks Are Needed**:

**Email Webhooks**:
- Email delivery status (delivered, bounced, failed)
- Email open tracking
- Email click tracking
- Unsubscribe events

**SMS Webhooks**:
- SMS delivery status (delivered, failed)
- Incoming SMS messages (for two-way)

**WhatsApp Webhooks**:
- WhatsApp message status (sent, delivered, read, failed)
- Incoming WhatsApp messages
- Template approval status

**Voice Webhooks** (if implementing):
- Call status (answered, busy, no-answer, failed)
- Call duration

**Implementation Requirements**:
- Create webhook endpoint routes
- Add webhook verification (Netcore sends verify token)
- Process webhook events
- Update notification status in database
- Log webhook events for debugging

**Files to Create/Modify**:
- `microservices/notification-service/src/routes/webhook.routes.js`
- `microservices/notification-service/src/controllers/webhook.controller.js`

---

### **Step 5: Template Management**

**Email Templates**:
- Create email templates in Netcore dashboard
- Map template IDs in Etelios configuration
- Use templates with dynamic variables

**SMS Templates**:
- Register SMS templates with DLT (for India)
- Map template IDs in Etelios configuration
- Use templates with dynamic variables

**WhatsApp Templates**:
- Create WhatsApp message templates in Netcore dashboard
- Get template approval from WhatsApp
- Map template IDs in Etelios configuration
- Use templates with dynamic variables

**Implementation Requirements**:
- Template ID configuration in environment variables
- Template variable mapping in notification service
- Template version management

---

### **Step 6: Testing & Validation**

**Testing Requirements**:

**Email Testing**:
- Test single email sending
- Test bulk email sending
- Test email templates with variables
- Verify email delivery
- Verify email open/click tracking
- Test bounce handling
- Test unsubscribe handling

**SMS Testing**:
- Test single SMS sending
- Test bulk SMS sending
- Test SMS templates with DLT
- Verify SMS delivery status
- Test webhook callbacks

**WhatsApp Testing**:
- Test WhatsApp template messages
- Test WhatsApp media messages
- Test WhatsApp interactive buttons
- Verify WhatsApp delivery status
- Test webhook callbacks

---

### **Step 7: Migration Strategy**

**Phased Migration Approach**:

**Phase 1: Email Service**
- Integrate Netcore Email API
- Test thoroughly
- Migrate email sending gradually
- Monitor email delivery rates

**Phase 2: SMS Service**
- Integrate Netcore SMS API
- Test SMS sending and templates
- Migrate SMS sending
- Monitor SMS delivery rates

**Phase 3: WhatsApp Service**
- Integrate Netcore WhatsApp API
- Create and approve WhatsApp templates
- Test WhatsApp messaging
- Migrate WhatsApp sending

**Phase 4: Voice Service** (Optional)
- Integrate Netcore Voice API
- Test voice calling
- Implement in production

**Rollback Plan**:
- Keep old service configuration as fallback
- Add feature flag to switch between old and new
- Monitor error rates and switch back if needed

---

## 🔐 Security & Compliance

### **API Key Security**:
- Store API keys in Azure Key Vault
- Never commit API keys to code
- Rotate API keys periodically
- Use different API keys for different environments

### **Webhook Security**:
- Verify webhook signatures from Netcore
- Use HTTPS for webhook endpoints
- Implement rate limiting on webhook endpoints
- Validate webhook payloads

### **DLT Compliance** (India SMS):
- Register all SMS templates with DLT
- Include DLT entity ID in SMS API calls
- Maintain DLT template ID mapping

### **GDPR/Privacy Compliance**:
- Handle unsubscribe requests properly
- Store user consent for marketing communications
- Respect opt-out preferences
- Provide unsubscribe links in all marketing emails

---

## 📊 Monitoring & Analytics

### **What to Monitor**:

**Email Metrics**:
- Delivery rate
- Open rate
- Click rate
- Bounce rate
- Unsubscribe rate

**SMS Metrics**:
- Delivery rate
- Delivery status distribution
- Template usage

**WhatsApp Metrics**:
- Delivery rate
- Read rate
- Template usage
- Media message success rate

### **Analytics Integration**:
- Log all communication events to analytics service
- Track success/failure rates
- Monitor cost per message
- Generate reports on communication performance

---

## 🔄 Maintenance & Updates

### **Ongoing Maintenance**:

**Template Management**:
- Update email templates as needed
- Refresh SMS DLT templates annually
- Update WhatsApp templates with approval

**Domain Management**:
- Monitor domain reputation
- Update SPF/DKIM records if needed
- Renew domain verification

**API Updates**:
- Stay updated with Netcore API changes
- Update SDKs/APIs as new versions release
- Test API changes in staging before production

**Monitoring**:
- Regular review of delivery rates
- Monitor error logs
- Review webhook callback logs
- Check for API key expiration

---

## 📝 Checklist for Integration

### **Pre-Integration**:
- [ ] Create Netcore account
- [ ] Get all API keys
- [ ] Verify email domain
- [ ] Register DLT for SMS (India)
- [ ] Register WhatsApp Business number
- [ ] Set up webhook URLs
- [ ] Configure environment variables

### **Integration**:
- [ ] Integrate Email API
- [ ] Integrate SMS API
- [ ] Integrate WhatsApp API
- [ ] Implement webhook handlers
- [ ] Set up template management
- [ ] Add error handling
- [ ] Add logging

### **Testing**:
- [ ] Test email sending
- [ ] Test SMS sending
- [ ] Test WhatsApp sending
- [ ] Test webhook callbacks
- [ ] Test templates with variables
- [ ] Test error scenarios
- [ ] Load testing

### **Deployment**:
- [ ] Deploy to staging
- [ ] Test in staging environment
- [ ] Deploy to production
- [ ] Monitor initial usage
- [ ] Verify delivery rates
- [ ] Switch traffic gradually

### **Post-Deployment**:
- [ ] Monitor metrics
- [ ] Review error logs
- [ ] Optimize based on data
- [ ] Document any issues
- [ ] Train team on new system

---

## 📞 Support & Resources

### **Netcore Resources**:
- Netcore API Documentation
- Netcore Dashboard
- Netcore Support Portal
- Netcore Developer Community

### **Internal Resources**:
- Etelios Notification Service Documentation
- Etelios CRM Service Documentation
- Etelios Auth Service Documentation
- Environment Variable Reference Guide

---

## 🎯 Key Benefits of Netcore Integration

**Unified Platform**:
- All communication channels in one platform
- Single dashboard for monitoring
- Consistent API structure

**Better India Coverage**:
- Optimized for Indian market
- DLT compliance built-in
- Better delivery rates in India

**Cost Efficiency**:
- Competitive pricing for Indian market
- Better value for high-volume usage
- Unified billing

**Enhanced Features**:
- Better template management
- Advanced analytics
- Better webhook support
- Real-time tracking

---

## 📌 Notes

- Keep old service configuration as backup during migration
- Test thoroughly in staging before production
- Monitor delivery rates after migration
- Update documentation as integration progresses
- Train team on Netcore dashboard usage
- Set up alerts for delivery failures

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Status**: Ready for Implementation

