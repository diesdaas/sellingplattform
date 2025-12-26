import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '@gocart/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TemplateService {
  constructor() {
    this.templates = new Map();
    this.templatesDir = path.join(__dirname, '../templates');
    this.loadTemplates();
  }

  // Load templates from files
  loadTemplates() {
    try {
      // Create templates directory if it doesn't exist
      if (!fs.existsSync(this.templatesDir)) {
        fs.mkdirSync(this.templatesDir, { recursive: true });
      }

      // Load built-in templates
      this.templates.set('welcome', this.getWelcomeTemplate());
      this.templates.set('order-confirmation', this.getOrderConfirmationTemplate());
      this.templates.set('shipping-update', this.getShippingUpdateTemplate());
      this.templates.set('password-reset', this.getPasswordResetTemplate());
      this.templates.set('test', this.getTestTemplate());

      logger.info('Email templates loaded', {
        count: this.templates.size
      });

    } catch (error) {
      logger.error('Failed to load email templates', { error: error.message });
    }
  }

  // Get template by name
  getTemplate(name, data = {}) {
    const template = this.templates.get(name);

    if (!template) {
      throw new Error(`Template '${name}' not found`);
    }

    return {
      subject: this.interpolate(template.subject, data),
      html: this.interpolate(template.html, data),
      text: this.interpolate(template.text, data)
    };
  }

  // Interpolate template variables
  interpolate(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  }

  // Welcome email template
  getWelcomeTemplate() {
    return {
      subject: 'Welcome to GoCart, {{userName}}!',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Welcome to GoCart</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white; }
              .content { padding: 40px 20px; background: #f9f9f9; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Welcome to GoCart!</h1>
            </div>

            <div class="content">
              <h2>Hi {{userName}},</h2>
              <p>Welcome to GoCart! We're excited to have you join our community of art lovers and creators.</p>

              <p>Here's what you can do:</p>
              <ul>
                <li>Browse and purchase amazing artworks</li>
                <li>Create your own artist store</li>
                <li>Upload and sell your creations</li>
                <li>Connect with other artists</li>
              </ul>

              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="button">Start Exploring</a>

              <p>If you have any questions, feel free to contact our support team.</p>
            </div>

            <div class="footer">
              <p>&copy; 2025 GoCart. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      text: `
Welcome to GoCart, {{userName}}!

Hi {{userName}},

Welcome to GoCart! We're excited to have you join our community of art lovers and creators.

Here's what you can do:
- Browse and purchase amazing artworks
- Create your own artist store
- Upload and sell your creations
- Connect with other artists

Start exploring: ${process.env.FRONTEND_URL || 'http://localhost:3000'}

If you have any questions, feel free to contact our support team.

Best regards,
The GoCart Team

---
© 2025 GoCart. All rights reserved.
      `
    };
  }

  // Order confirmation template
  getOrderConfirmationTemplate() {
    return {
      subject: 'Order Confirmation - Order #{{orderId}}',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Order Confirmation</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white; }
              .content { padding: 40px 20px; background: #f9f9f9; }
              .order-details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
              .item { border-bottom: 1px solid #eee; padding: 10px 0; }
              .total { font-weight: bold; font-size: 18px; color: #667eea; }
              .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Order Confirmed!</h1>
            </div>

            <div class="content">
              <h2>Hi {{userName}},</h2>
              <p>Thank you for your order! Your order #{{orderId}} has been successfully placed.</p>

              <div class="order-details">
                <h3>Order Details</h3>
                <div class="item">
                  <strong>Order ID:</strong> {{orderId}}<br>
                  <strong>Date:</strong> {{orderDate}}<br>
                  <strong>Status:</strong> {{orderStatus}}
                </div>

                <div class="item">
                  <strong>Shipping Address:</strong><br>
                  {{shippingAddress}}
                </div>

                <div class="item">
                  <strong>Items:</strong><br>
                  {{orderItems}}
                </div>

                <div class="total">
                  Total: {{currencySymbol}}{{totalAmount}}
                </div>
              </div>

              <p>You'll receive another email when your order ships. Track your order status at any time from your account.</p>

              <p>Thank you for shopping with GoCart!</p>
            </div>

            <div class="footer">
              <p>&copy; 2025 GoCart. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      text: `
Order Confirmation - Order #{{orderId}}

Hi {{userName}},

Thank you for your order! Your order #{{orderId}} has been successfully placed.

Order Details:
- Order ID: {{orderId}}
- Date: {{orderDate}}
- Status: {{orderStatus}}
- Shipping Address: {{shippingAddress}}
- Items: {{orderItems}}
- Total: {{currencySymbol}}{{totalAmount}}

You'll receive another email when your order ships. Track your order status at any time from your account.

Thank you for shopping with GoCart!

Best regards,
The GoCart Team

---
© 2025 GoCart. All rights reserved.
      `
    };
  }

  // Shipping update template
  getShippingUpdateTemplate() {
    return {
      subject: 'Your Order Has Shipped - Order #{{orderId}}',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Order Shipped</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white; }
              .content { padding: 40px 20px; background: #f9f9f9; }
              .tracking { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #667eea; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
              .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Your Order Has Shipped!</h1>
            </div>

            <div class="content">
              <h2>Hi {{userName}},</h2>
              <p>Great news! Your order #{{orderId}} has been shipped and is on its way to you.</p>

              <div class="tracking">
                <h3>Tracking Information</h3>
                <p><strong>Carrier:</strong> {{carrier}}</p>
                <p><strong>Tracking Number:</strong> {{trackingNumber}}</p>
                <p><strong>Estimated Delivery:</strong> {{estimatedDelivery}}</p>

                <a href="{{trackingUrl}}" class="button">Track Your Package</a>
              </div>

              <p>You can also track your order status from your GoCart account at any time.</p>

              <p>Thank you for choosing GoCart!</p>
            </div>

            <div class="footer">
              <p>&copy; 2025 GoCart. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      text: `
Your Order Has Shipped - Order #{{orderId}}

Hi {{userName}},

Great news! Your order #{{orderId}} has been shipped and is on its way to you.

Tracking Information:
- Carrier: {{carrier}}
- Tracking Number: {{trackingNumber}}
- Estimated Delivery: {{estimatedDelivery}}
- Tracking URL: {{trackingUrl}}

You can also track your order status from your GoCart account at any time.

Thank you for choosing GoCart!

Best regards,
The GoCart Team

---
© 2025 GoCart. All rights reserved.
      `
    };
  }

  // Password reset template
  getPasswordResetTemplate() {
    return {
      subject: 'Reset Your GoCart Password',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Reset Password</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white; }
              .content { padding: 40px 20px; background: #f9f9f9; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
              .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Reset Your Password</h1>
            </div>

            <div class="content">
              <h2>Hi {{userName}},</h2>
              <p>We received a request to reset your password. Click the button below to create a new password.</p>

              <div style="text-align: center;">
                <a href="{{resetUrl}}" class="button">Reset Password</a>
              </div>

              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 3px;">{{resetUrl}}</p>

              <div class="warning">
                <strong>Security Notice:</strong> This link will expire in 1 hour for your security. If you didn't request this password reset, please ignore this email.
              </div>

              <p>If you have any questions, contact our support team.</p>
            </div>

            <div class="footer">
              <p>&copy; 2025 GoCart. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      text: `
Reset Your GoCart Password

Hi {{userName}},

We received a request to reset your password. Click this link to create a new password:

{{resetUrl}}

This link will expire in 1 hour for your security.

If you didn't request this password reset, please ignore this email.

If you have any questions, contact our support team.

Best regards,
The GoCart Team

---
© 2025 GoCart. All rights reserved.
      `
    };
  }

  // Test template
  getTestTemplate() {
    return {
      subject: 'GoCart Test Email',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Test Email</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white; }
              .content { padding: 40px 20px; background: #f9f9f9; }
              .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>GoCart Test Email</h1>
            </div>

            <div class="content">
              <h2>Test Email</h2>
              <p>This is a test email from GoCart.</p>
              <p><strong>Sent at:</strong> {{timestamp}}</p>
              <p><strong>Recipient:</strong> {{recipientEmail}}</p>
              <p>If you received this email, the notification system is working correctly!</p>
            </div>

            <div class="footer">
              <p>&copy; 2025 GoCart. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      text: `
GoCart Test Email

This is a test email from GoCart.

Sent at: {{timestamp}}
Recipient: {{recipientEmail}}

If you received this email, the notification system is working correctly!

---
© 2025 GoCart. All rights reserved.
      `
    };
  }

  // Add custom template
  addTemplate(name, template) {
    this.templates.set(name, template);
    logger.info('Custom template added', { name });
  }

  // Remove template
  removeTemplate(name) {
    const deleted = this.templates.delete(name);
    if (deleted) {
      logger.info('Template removed', { name });
    }
    return deleted;
  }

  // List all templates
  listTemplates() {
    return Array.from(this.templates.keys());
  }
}

export default new TemplateService();
