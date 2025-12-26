import nodemailer from 'nodemailer';
import { logger } from '@gocart/shared';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Create transporter
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        // For development, you can use ethereal.email
        ...(process.env.NODE_ENV === 'development' && {
          host: 'smtp.ethereal.email',
          port: 587,
          auth: {
            user: process.env.ETHEREAL_USER || 'test@example.com',
            pass: process.env.ETHEREAL_PASS || 'test'
          }
        })
      });

      // Verify connection
      await this.transporter.verify();
      this.initialized = true;

      logger.info('Email service initialized', {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587
      });

    } catch (error) {
      logger.error('Failed to initialize email service', { error: error.message });
      throw error;
    }
  }

  // Send email
  async sendEmail(to, subject, html, text = null) {
    try {
      await this.initialize();

      const mailOptions = {
        from: `"${process.env.FROM_NAME || 'GoCart'}" <${process.env.FROM_EMAIL || 'noreply@gocart.com'}>`,
        to,
        subject,
        html,
        ...(text && { text })
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        to,
        subject,
        messageId: info.messageId,
        response: info.response
      });

      return {
        success: true,
        messageId: info.messageId,
        envelope: info.envelope
      };

    } catch (error) {
      logger.error('Failed to send email', {
        error: error.message,
        to,
        subject
      });
      throw error;
    }
  }

  // Send bulk emails
  async sendBulkEmails(emails) {
    try {
      await this.initialize();

      const results = [];

      for (const email of emails) {
        try {
          const result = await this.sendEmail(
            email.to,
            email.subject,
            email.html,
            email.text
          );
          results.push({ ...email, ...result, status: 'sent' });
        } catch (error) {
          logger.error('Failed to send email in bulk', {
            error: error.message,
            to: email.to
          });
          results.push({ ...email, error: error.message, status: 'failed' });
        }
      }

      return results;

    } catch (error) {
      logger.error('Bulk email sending failed', { error: error.message });
      throw error;
    }
  }

  // Send templated email
  async sendTemplatedEmail(to, templateName, templateData) {
    try {
      const templateService = await import('./templateService.js');
      const template = templateService.default.getTemplate(templateName, templateData);

      return await this.sendEmail(to, template.subject, template.html, template.text);

    } catch (error) {
      logger.error('Failed to send templated email', {
        error: error.message,
        to,
        templateName
      });
      throw error;
    }
  }

  // Get email transport info
  getTransportInfo() {
    return {
      configured: this.initialized,
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      fromEmail: process.env.FROM_EMAIL,
      fromName: process.env.FROM_NAME
    };
  }

  // Close transporter
  async close() {
    if (this.transporter) {
      this.transporter.close();
      this.initialized = false;
      logger.info('Email service closed');
    }
  }
}

export default new EmailService();
