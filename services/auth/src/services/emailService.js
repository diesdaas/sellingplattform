import nodemailer from 'nodemailer';
import { logger } from '@gocart/shared';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    // Skip initialization in development if no SMTP config
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST && !process.env.SMTP_USER) {
      logger.warn('Email service not configured for development - emails will be logged only');
      this.mockMode = true;
      this.initialized = true;
      return;
    }

    try {
      // Create transporter
      this.transporter = nodemailer.createTransport({
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

  // Send email verification
  async sendEmailVerification(user, verificationToken) {
    try {
      await this.initialize();

      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

      // Mock mode - just log the email
      if (this.mockMode) {
        logger.info('Email verification (mock mode)', {
          userId: user.id,
          email: user.email,
          verificationUrl: verificationUrl
        });
        return { success: true, mock: true, message: 'Email verification link logged (mock mode)' };
      }

      const mailOptions = {
        from: `"${process.env.FROM_NAME || 'GoCart'}" <${process.env.FROM_EMAIL || 'noreply@gocart.com'}>`,
        to: user.email,
        subject: 'Verify your GoCart account',
        html: this.getEmailVerificationTemplate(user, verificationUrl),
        text: this.getEmailVerificationText(user, verificationUrl)
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Email verification sent', {
        userId: user.id,
        email: user.email,
        messageId: info.messageId
      });

      return { success: true, messageId: info.messageId };

    } catch (error) {
      logger.error('Failed to send email verification', {
        error: error.message,
        userId: user.id,
        email: user.email
      });
      throw error;
    }
  }

  // Send password reset email
  async sendPasswordReset(user, resetToken) {
    try {
      await this.initialize();

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

      const mailOptions = {
        from: `"${process.env.FROM_NAME || 'GoCart'}" <${process.env.FROM_EMAIL || 'noreply@gocart.com'}>`,
        to: user.email,
        subject: 'Reset your GoCart password',
        html: this.getPasswordResetTemplate(user, resetUrl),
        text: this.getPasswordResetText(user, resetUrl)
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Password reset email sent', {
        userId: user.id,
        email: user.email,
        messageId: info.messageId
      });

      return { success: true, messageId: info.messageId };

    } catch (error) {
      logger.error('Failed to send password reset email', {
        error: error.message,
        userId: user.id,
        email: user.email
      });
      throw error;
    }
  }

  // Send welcome email
  async sendWelcomeEmail(user) {
    try {
      await this.initialize();

      const mailOptions = {
        from: `"${process.env.FROM_NAME || 'GoCart'}" <${process.env.FROM_EMAIL || 'noreply@gocart.com'}>`,
        to: user.email,
        subject: 'Welcome to GoCart!',
        html: this.getWelcomeTemplate(user),
        text: this.getWelcomeText(user)
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Welcome email sent', {
        userId: user.id,
        email: user.email,
        messageId: info.messageId
      });

      return { success: true, messageId: info.messageId };

    } catch (error) {
      logger.error('Failed to send welcome email', {
        error: error.message,
        userId: user.id,
        email: user.email
      });
      throw error;
    }
  }

  // Email templates
  getEmailVerificationTemplate(user, verificationUrl) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Verify your GoCart account</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to GoCart!</h1>
          </div>

          <div style="padding: 40px 20px; background: #f9f9f9;">
            <h2 style="color: #333; margin-top: 0;">Verify your email address</h2>
            <p style="color: #666; line-height: 1.6;">
              Hi ${user.name},<br><br>
              Thanks for signing up for GoCart! Please verify your email address to complete your registration.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Verify Email Address
              </a>
            </div>

            <p style="color: #666; line-height: 1.6;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a>
            </p>

            <p style="color: #999; font-size: 14px;">
              This link will expire in 24 hours for security reasons.
            </p>
          </div>

          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
            <p>&copy; 2025 GoCart. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
  }

  getPasswordResetTemplate(user, resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reset your password</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Reset your password</h1>
          </div>

          <div style="padding: 40px 20px; background: #f9f9f9;">
            <h2 style="color: #333; margin-top: 0;">Password reset request</h2>
            <p style="color: #666; line-height: 1.6;">
              Hi ${user.name},<br><br>
              We received a request to reset your password. Click the button below to create a new password.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Reset Password
              </a>
            </div>

            <p style="color: #666; line-height: 1.6;">
              If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </p>

            <p style="color: #999; font-size: 14px;">
              This link will expire in 1 hour for security reasons.
            </p>
          </div>

          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
            <p>&copy; 2025 GoCart. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
  }

  getWelcomeTemplate(user) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to GoCart!</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to GoCart!</h1>
          </div>

          <div style="padding: 40px 20px; background: #f9f9f9;">
            <h2 style="color: #333; margin-top: 0;">Your account is ready!</h2>
            <p style="color: #666; line-height: 1.6;">
              Hi ${user.name},<br><br>
              Welcome to GoCart! Your account has been successfully created and verified.
            </p>

            <p style="color: #666; line-height: 1.6;">
              You can now:
            </p>
            <ul style="color: #666; line-height: 1.6;">
              <li>Browse and purchase amazing artwork</li>
              <li>Create your own artist store</li>
              <li>Upload and sell your artwork</li>
              <li>Connect with other artists</li>
            </ul>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Start Exploring
              </a>
            </div>
          </div>

          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
            <p>&copy; 2025 GoCart. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
  }

  // Text versions for email clients that don't support HTML
  getEmailVerificationText(user, verificationUrl) {
    return `
Welcome to GoCart!

Hi ${user.name},

Thanks for signing up! Please verify your email address by clicking this link:
${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account, please ignore this email.

Best regards,
The GoCart Team
    `;
  }

  getPasswordResetText(user, resetUrl) {
    return `
Password Reset Request

Hi ${user.name},

We received a request to reset your password. Click this link to create a new password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this reset, please ignore this email.

Best regards,
The GoCart Team
    `;
  }

  getWelcomeText(user) {
    return `
Welcome to GoCart!

Hi ${user.name},

Your account has been successfully created and verified!

You can now browse amazing artwork, create your own store, and connect with other artists.

Start exploring: ${process.env.FRONTEND_URL || 'http://localhost:3000'}

Best regards,
The GoCart Team
    `;
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
