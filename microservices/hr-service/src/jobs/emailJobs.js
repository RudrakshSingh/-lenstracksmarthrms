const logger = require('../config/logger');
const { sendEmail } = require('../utils/email');

/**
 * Send transfer notification email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.employeeName - Employee name
 * @param {string} options.fromStore - Source store name
 * @param {string} options.toStore - Destination store name
 * @param {Date} options.effectiveDate - Transfer effective date
 * @param {string} options.reason - Transfer reason
 * @returns {Promise<void>}
 */
const sendTransferNotificationEmail = async ({
  to,
  employeeName,
  fromStore,
  toStore,
  effectiveDate,
  reason
}) => {
  try {
    const subject = `Transfer Notification: ${employeeName}`;
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c3e50;">Transfer Notification</h2>
            <p>Dear ${employeeName},</p>
            <p>This is to inform you that your transfer request has been processed.</p>
            <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>From Store:</strong> ${fromStore}</p>
              <p><strong>To Store:</strong> ${toStore}</p>
              <p><strong>Effective Date:</strong> ${new Date(effectiveDate).toLocaleDateString('en-IN')}</p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            </div>
            <p>Please contact HR if you have any questions.</p>
            <p>Best regards,<br>HR Team</p>
          </div>
        </body>
      </html>
    `;

    await sendEmail({
      to,
      subject,
      html
    });

    logger.info('Transfer notification email sent', { to, employeeName });
  } catch (error) {
    logger.error('Failed to send transfer notification email', {
      error: error.message,
      to,
      employeeName
    });
    // Don't throw - email failure shouldn't break the transfer process
  }
};

/**
 * Send HR letter email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 * @param {string} options.attachmentUrl - Optional attachment URL
 * @returns {Promise<void>}
 */
const sendHRLetterEmail = async ({
  to,
  subject,
  html,
  attachmentUrl
}) => {
  try {
    await sendEmail({
      to,
      subject,
      html,
      attachments: attachmentUrl ? [{ path: attachmentUrl }] : []
    });

    logger.info('HR letter email sent', { to, subject });
  } catch (error) {
    logger.error('Failed to send HR letter email', {
      error: error.message,
      to,
      subject
    });
    throw error;
  }
};

/**
 * Send leave approval notification
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.employeeName - Employee name
 * @param {string} options.leaveType - Leave type
 * @param {Date} options.fromDate - Leave start date
 * @param {Date} options.toDate - Leave end date
 * @param {string} options.status - Approval status
 * @returns {Promise<void>}
 */
const sendLeaveApprovalEmail = async ({
  to,
  employeeName,
  leaveType,
  fromDate,
  toDate,
  status
}) => {
  try {
    const subject = `Leave ${status === 'APPROVED' ? 'Approved' : 'Rejected'}: ${employeeName}`;
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: ${status === 'APPROVED' ? '#27ae60' : '#e74c3c'};">Leave ${status === 'APPROVED' ? 'Approved' : 'Rejected'}</h2>
            <p>Dear ${employeeName},</p>
            <p>Your leave request has been <strong>${status}</strong>.</p>
            <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Leave Type:</strong> ${leaveType}</p>
              <p><strong>From:</strong> ${new Date(fromDate).toLocaleDateString('en-IN')}</p>
              <p><strong>To:</strong> ${new Date(toDate).toLocaleDateString('en-IN')}</p>
            </div>
            <p>Best regards,<br>HR Team</p>
          </div>
        </body>
      </html>
    `;

    await sendEmail({
      to,
      subject,
      html
    });

    logger.info('Leave approval email sent', { to, employeeName, status });
  } catch (error) {
    logger.error('Failed to send leave approval email', {
      error: error.message,
      to,
      employeeName
    });
  }
};

module.exports = {
  sendTransferNotificationEmail,
  sendHRLetterEmail,
  sendLeaveApprovalEmail
};

