const axios = require('axios');
const Notification = require('../models/Notification.model');
const NotificationPreference = require('../models/NotificationPreference.model');
const EmailQueue = require('../models/EmailQueue.model');
const SmsQueue = require('../models/SmsQueue.model');
const WebhookLog = require('../models/WebhookLog.model');
const Employee = require('../models/Employee.model');
const logger = require('../config/logger');

class NotificationService {
  constructor() {
    this.sesClient = null;
    this.snsClient = null;
  }

  getProviderMode() {
    return process.env.NOTIFICATION_PROVIDER_MODE || 'mock';
  }

  getRealtimeEnabled() {
    return process.env.NOTIFICATION_REALTIME_DISPATCH !== 'false';
  }

  /** Push in-app events to realtime-service (Socket.IO tenant room). */
  getRealtimeSocketPushEnabled() {
    return process.env.NOTIFICATION_REALTIME_SOCKET !== 'false';
  }

  getRealtimeServiceBaseUrl() {
    return (
      process.env.REALTIME_SERVICE_URL ||
      process.env.NOTIFICATION_REALTIME_SERVICE_URL ||
      ''
    );
  }

  async pushInAppNotificationsToRealtime(tenantId, documents, recipientEmailById) {
    const base = this.getRealtimeServiceBaseUrl();
    if (!base || !this.getRealtimeSocketPushEnabled() || !documents.length) {
      return;
    }
    const url = `${base.replace(/\/$/, '')}/api/events/jts-in-app`;
    await Promise.all(
      documents.map(async (doc) => {
        const rid = String(doc.recipient_id);
        try {
          await axios.post(
            url,
            {
              tenantId: String(tenantId),
              recipient_id: rid,
              recipient_email: recipientEmailById.get(rid) || null,
              title: doc.title,
              message: doc.message,
              type: doc.type,
              notification_id: String(doc._id),
              payload: doc.payload || {}
            },
            { timeout: 8000 }
          );
        } catch (error) {
          logger.warn('In-app realtime push failed', {
            tenantId: String(tenantId),
            recipient_id: rid,
            error: error.message
          });
        }
      })
    );
  }

  getSesConfig() {
    return {
      fromEmail: process.env.SES_FROM_EMAIL,
      configurationSetName: process.env.SES_CONFIGURATION_SET || null,
      fromEmailIdentityArn: process.env.SES_FROM_EMAIL_IDENTITY_ARN || null,
      replyTo: process.env.SES_REPLY_TO_EMAIL || null
    };
  }

  getAwsConfig() {
    const region = process.env.AWS_REGION || 'ap-south-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const sessionToken = process.env.AWS_SESSION_TOKEN;

    if (accessKeyId && secretAccessKey) {
      return {
        region,
        credentials: { accessKeyId, secretAccessKey, sessionToken }
      };
    }

    return { region };
  }

  ensureAwsClients() {
    if (this.sesClient && this.snsClient) {
      return;
    }

    let SESv2Client;
    let SendEmailCommand;
    let SNSClient;
    let PublishCommand;

    try {
      ({ SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2'));
      ({ SNSClient, PublishCommand } = require('@aws-sdk/client-sns'));
    } catch (error) {
      throw new Error('NOTIFICATION_003_AWS_SDK_MISSING');
    }

    const awsConfig = this.getAwsConfig();
    this.sesClient = new SESv2Client(awsConfig);
    this.snsClient = new SNSClient(awsConfig);
    this.SendEmailCommand = SendEmailCommand;
    this.PublishCommand = PublishCommand;
  }

  async sendEmailAws(row) {
    this.ensureAwsClients();
    const sesConfig = this.getSesConfig();
    if (!sesConfig.fromEmail) {
      throw new Error('NOTIFICATION_004_SES_FROM_EMAIL_MISSING');
    }

    const commandInput = {
      FromEmailAddress: sesConfig.fromEmail,
      Destination: {
        ToAddresses: [row.to_email]
      },
      Content: {
        Simple: {
          Subject: { Data: row.subject || 'Notification' },
          Body: {
            Text: { Data: row.body_text || row.body_html || '' },
            Html: { Data: row.body_html || `<p>${row.body_text || ''}</p>` }
          }
        }
      }
    };

    if (sesConfig.configurationSetName) {
      commandInput.ConfigurationSetName = sesConfig.configurationSetName;
    }
    if (sesConfig.fromEmailIdentityArn) {
      commandInput.FromEmailAddressIdentityArn = sesConfig.fromEmailIdentityArn;
    }
    if (sesConfig.replyTo) {
      commandInput.ReplyToAddresses = [sesConfig.replyTo];
    }

    await this.sesClient.send(new this.SendEmailCommand(commandInput));
  }

  /**
   * Send a single SES email (no queue). For ops verification only.
   * Requires NOTIFICATION_PROVIDER_MODE=aws and SES_FROM_EMAIL.
   */
  async sendTestEmail({ to_email: toEmail, subject, message }) {
    const mode = this.getProviderMode();
    if (mode !== 'aws') {
      throw new Error('NOTIFICATION_005_PROVIDER_NOT_AWS');
    }
    const trimmed = typeof toEmail === 'string' ? toEmail.trim() : '';
    if (!trimmed) {
      throw new Error('NOTIFICATION_006_TEST_EMAIL_TO_MISSING');
    }

    const subjectLine = subject || 'Etelios SES test';
    const body =
      message ||
      `This is a test email from Etelios JTS (AWS SES). Sent at ${new Date().toISOString()}`;
    const escaped = String(body)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    await this.sendEmailAws({
      to_email: trimmed,
      subject: subjectLine,
      body_text: body,
      body_html: `<p>${escaped}</p>`
    });

    return { to_email: trimmed, subject: subjectLine };
  }

  async sendSmsAws(row) {
    this.ensureAwsClients();
    const senderId = process.env.SNS_SMS_SENDER_ID || 'JTS';
    const smsType = process.env.SNS_SMS_TYPE || 'Transactional';

    await this.snsClient.send(new this.PublishCommand({
      PhoneNumber: row.to_phone,
      Message: row.message,
      MessageAttributes: {
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: senderId
        },
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: smsType
        }
      }
    }));
  }

  async getOrCreatePreference(tenantId, employeeId) {
    let preference = await NotificationPreference.findOne({
      tenant_id: tenantId,
      employee_id: employeeId
    });

    if (!preference) {
      preference = await NotificationPreference.create({
        tenant_id: tenantId,
        employee_id: employeeId
      });
    }

    return preference;
  }

  async updatePreference(tenantId, employeeId, payload) {
    return NotificationPreference.findOneAndUpdate(
      { tenant_id: tenantId, employee_id: employeeId },
      { $set: payload },
      { upsert: true, new: true }
    );
  }

  async getInbox(tenantId, employeeId, filters = {}) {
    const query = {
      tenant_id: tenantId,
      recipient_id: employeeId
    };

    if (filters.read === 'true') query.read = true;
    if (filters.read === 'false') query.read = false;
    if (filters.type) query.type = filters.type;

    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(query);
    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async markAsRead(tenantId, employeeId, notificationId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, tenant_id: tenantId, recipient_id: employeeId },
      { $set: { read: true, read_at: new Date() } },
      { new: true }
    );

    if (!notification) {
      throw new Error('NOTIFICATION_001_NOT_FOUND');
    }

    return notification;
  }

  async markAllAsRead(tenantId, employeeId) {
    const result = await Notification.updateMany(
      { tenant_id: tenantId, recipient_id: employeeId, read: false },
      { $set: { read: true, read_at: new Date() } }
    );

    return { modified_count: result.modifiedCount || 0 };
  }

  /**
   * Queue integration webhook (Slack/Zapier/custom). Processed by notificationDispatcher job.
   */
  async enqueueIntegrationWebhook(tenantId, webhookUrl, eventType, payload) {
    const url = typeof webhookUrl === 'string' ? webhookUrl.trim() : '';
    if (!url) return { enqueued: false };
    await WebhookLog.create({
      tenant_id: tenantId,
      webhook_url: url,
      event_type: eventType,
      payload: { ...(payload && typeof payload === 'object' ? payload : {}), event_type: eventType },
      status: 'PENDING',
      created_at: new Date()
    });
    return { enqueued: true };
  }

  async dispatch(tenantId, payload) {
    const {
      recipient_ids = [],
      type,
      title,
      message,
      channels = ['in_app'],
      event_type,
      webhook_url,
      metadata
    } = payload;

    if (!Array.isArray(recipient_ids) || recipient_ids.length === 0) {
      throw new Error('NOTIFICATION_002_NO_RECIPIENTS');
    }

    const employees = await Employee.find({
      tenant_id: tenantId,
      _id: { $in: recipient_ids },
      status: 'ACTIVE'
    }).select('_id email phone');

    const employeeMap = new Map(employees.map((employee) => [String(employee._id), employee]));
    const preferences = await NotificationPreference.find({
      tenant_id: tenantId,
      employee_id: { $in: recipient_ids }
    });
    const preferenceMap = new Map(preferences.map((p) => [String(p.employee_id), p]));

    const inAppDocs = [];
    const emailDocs = [];
    const smsDocs = [];
    const recipientEmailById = new Map();

    for (const recipientId of recipient_ids) {
      const employee = employeeMap.get(String(recipientId));
      if (!employee) continue;
      const preference = preferenceMap.get(String(recipientId));

      const allowInApp = preference ? preference.channel_in_app !== false : true;
      const allowEmail = preference ? preference.channel_email !== false : true;
      const allowSms = preference ? preference.channel_sms === true : false;

      if (channels.includes('in_app') && allowInApp) {
        recipientEmailById.set(String(recipientId), employee.email || null);
        inAppDocs.push({
          tenant_id: tenantId,
          recipient_id: recipientId,
          type,
          title,
          message,
          payload: metadata || {},
          created_at: new Date()
        });
      }

      if (channels.includes('email') && allowEmail && employee.email) {
        emailDocs.push({
          tenant_id: tenantId,
          to_email: employee.email,
          subject: title,
          body_text: message,
          body_html: `<p>${message}</p>`,
          template_code: type,
          status: 'PENDING',
          created_at: new Date()
        });
      }

      if (channels.includes('sms') && allowSms && employee.phone) {
        smsDocs.push({
          tenant_id: tenantId,
          to_phone: employee.phone,
          message,
          template_code: type,
          status: 'PENDING',
          created_at: new Date()
        });
      }
    }

    let insertedInApp = [];
    if (inAppDocs.length > 0) {
      insertedInApp = await Notification.insertMany(inAppDocs, { ordered: false });
      if (this.getRealtimeSocketPushEnabled()) {
        await this.pushInAppNotificationsToRealtime(
          tenantId,
          insertedInApp,
          recipientEmailById
        );
      }
    }

    const providerMode = this.getProviderMode();
    const realtimeEnabled = this.getRealtimeEnabled();
    let insertedEmailRows = [];
    let insertedSmsRows = [];

    if (emailDocs.length > 0) {
      insertedEmailRows = await EmailQueue.insertMany(emailDocs, { ordered: false });
    }
    if (smsDocs.length > 0) {
      insertedSmsRows = await SmsQueue.insertMany(smsDocs, { ordered: false });
    }

    if (channels.includes('webhook') && webhook_url) {
      await WebhookLog.create({
        tenant_id: tenantId,
        webhook_url,
        event_type: event_type || type,
        payload: {
          recipients: recipient_ids,
          title,
          message,
          metadata: metadata || {}
        },
        status: 'PENDING',
        created_at: new Date()
      });
    }

    if (realtimeEnabled && providerMode === 'aws') {
      if (insertedEmailRows.length > 0) {
        await this.processEmailRows(insertedEmailRows, providerMode);
      }
      if (insertedSmsRows.length > 0) {
        await this.processSmsRows(insertedSmsRows, providerMode);
      }
    }

    return {
      recipients_total: recipient_ids.length,
      in_app_enqueued: inAppDocs.length,
      email_enqueued: emailDocs.length,
      sms_enqueued: smsDocs.length,
      webhook_enqueued: channels.includes('webhook') && webhook_url ? 1 : 0
    };
  }

  async processPendingQueues(limit = 100) {
    const providerMode = this.getProviderMode();

    const [emailProcessed, smsProcessed, webhookProcessed] = await Promise.all([
      this.processPendingEmails(limit, providerMode),
      this.processPendingSms(limit, providerMode),
      this.processPendingWebhooks(limit)
    ]);

    return { emailProcessed, smsProcessed, webhookProcessed };
  }

  async processPendingEmails(limit, providerMode) {
    const rows = await EmailQueue.find({ status: 'PENDING' }).sort({ created_at: 1 }).limit(limit);
    return this.processEmailRows(rows, providerMode);
  }

  async processPendingSms(limit, providerMode) {
    const rows = await SmsQueue.find({ status: 'PENDING' }).sort({ created_at: 1 }).limit(limit);
    return this.processSmsRows(rows, providerMode);
  }

  async processEmailRows(rows, providerMode) {
    let processed = 0;
    for (const row of rows) {
      try {
        if (providerMode === 'aws') {
          await this.sendEmailAws(row);
        } else if (providerMode !== 'mock') {
          throw new Error('EMAIL_PROVIDER_NOT_CONFIGURED');
        }

        row.status = 'SENT';
        row.sent_at = new Date();
        row.last_error = null;
      } catch (error) {
        logger.error('Email delivery failed', {
          email: row.to_email,
          error: error.message
        });
        row.retries += 1;
        row.last_error = error.message;
        if (row.retries >= row.max_retries) row.status = 'FAILED';
      }
      await row.save();
      processed += 1;
    }
    return processed;
  }

  async processSmsRows(rows, providerMode) {
    let processed = 0;
    for (const row of rows) {
      try {
        if (providerMode === 'aws') {
          await this.sendSmsAws(row);
        } else if (providerMode !== 'mock') {
          throw new Error('SMS_PROVIDER_NOT_CONFIGURED');
        }
        row.status = 'SENT';
        row.sent_at = new Date();
        row.last_error = null;
      } catch (error) {
        logger.error('SMS delivery failed', {
          phone: row.to_phone,
          error: error.message
        });
        row.retries += 1;
        row.last_error = error.message;
        if (row.retries >= row.max_retries) row.status = 'FAILED';
      }
      await row.save();
      processed += 1;
    }
    return processed;
  }

  async processPendingWebhooks(limit) {
    const rows = await WebhookLog.find({ status: 'PENDING' }).sort({ created_at: 1 }).limit(limit);
    let processed = 0;
    for (const row of rows) {
      try {
        const response = await axios.post(row.webhook_url, row.payload, {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        });
        row.response_status = response.status;
        row.response_body = typeof response.data === 'string'
          ? response.data
          : JSON.stringify(response.data);
        row.status = 'SUCCESS';
        row.error_message = null;
      } catch (error) {
        row.retries += 1;
        row.response_status = error.response?.status;
        row.response_body = error.response?.data
          ? JSON.stringify(error.response.data)
          : null;
        row.error_message = error.message;
        if (row.retries >= 5) row.status = 'FAILED';
      }
      row.processed_at = new Date();
      await row.save();
      processed += 1;
    }
    return processed;
  }

  async providersHealth() {
    const mode = this.getProviderMode();
    const sesConfig = this.getSesConfig();
    const summary = {
      mode,
      realtime_dispatch: this.getRealtimeEnabled(),
      realtime_socket_push: this.getRealtimeSocketPushEnabled(),
      realtime_service_url: this.getRealtimeServiceBaseUrl() || null,
      ses: {
        configured: false,
        from_email: sesConfig.fromEmail,
        configuration_set: sesConfig.configurationSetName
      },
      sns: { configured: false }
    };

    if (mode !== 'aws') {
      return { ...summary, note: 'Provider mode is not aws; set NOTIFICATION_PROVIDER_MODE=aws for SES/SNS' };
    }

    // Try initialize clients
    try {
      this.ensureAwsClients();
    } catch (error) {
      return { ...summary, error: error.message };
    }

    // SES account check
    try {
      const { GetAccountCommand } = require('@aws-sdk/client-sesv2');
      const resp = await this.sesClient.send(new GetAccountCommand({}));
      summary.ses.configured = true;
      summary.ses.details = {
        productionAccessEnabled: resp.ProductionAccessEnabled,
        enforcedSendingLimits: resp.EnforcementStatus || null,
        max24HourSend: resp.SendingLimits?.Max24HourSend,
        maxSendRate: resp.SendingLimits?.MaxSendRate
      };
    } catch (error) {
      summary.ses.error = error.message;
    }

    // SNS simple publish dry-check by creating a command (no send)
    try {
      // No direct "health" API; assume configured if client exists and region is set
      summary.sns.configured = !!this.snsClient && !!this.getAwsConfig().region;
    } catch (error) {
      summary.sns.error = error.message;
    }

    return summary;
  }
}

module.exports = new NotificationService();
